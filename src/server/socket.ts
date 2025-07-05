import { Server, Socket } from "socket.io";
import User from "../models/User";
import Whiteboard from "../models/Whiteboard";
import { verifyToken } from "../lib/auth";
import connectDB from "../lib/db";
import {
  WhiteboardElement,
  StickyNote,
  ActivityUpdate,
  UserPresence,
} from "./types";

export const setupSocket = (io: Server) => {
  io.on("connection", async (socket: Socket) => {
    console.log("🔌 New connection:", socket.id);

    const token = socket.handshake.auth.token;
    if (!token || typeof token !== "string") {
      console.warn("❌ Missing or invalid token");
      socket.disconnect();
      return;
    }

    let email = "", userId = "", username = "";
    try {
      const decoded = verifyToken(token);
      email = decoded.email;
      userId = decoded.userId;
      username = decoded.name;
      socket.data.user = { email, userId, username };
    } catch (err) {
      console.error("❌ Token verification failed", err);
      socket.disconnect();
      return;
    }

    // Join room
    socket.on("join_whiteboard", async (whiteboardId: string) => {
      try {
        await connectDB();

        const whiteboard = await Whiteboard.findById(whiteboardId);
        if (!whiteboard) {
          socket.emit("error", { message: "Whiteboard not found" });
          return;
        }

        const isOwner = whiteboard.owner.toString() === userId;
        const isCollaborator = whiteboard.collaborators.includes(email);
        if (!isOwner && !isCollaborator) {
          socket.emit("error_unauthorized", { message: "Unauthorized access" });
          return;
        }

        const user = await User.findById(userId).select("name");
        if (!user) {
          socket.emit("error_user_not_found", { message: "User not found" });
          return;
        }

        const room = `whiteboard_${whiteboardId}`;
        socket.join(room);
        socket.data.room = room;

        const presence: UserPresence = { email, username, joined: true };
        socket.to(room).emit("user_presence", presence);

        socket.emit("initial_state", {
          elements: whiteboard.elements || [],
          stickyNotes: whiteboard.stickyNotes || [],
        });

        const activity = (action: string): ActivityUpdate => ({
          userId,
          username,
          action,
          timestamp: new Date().toISOString(),
        });

        // Drawing Events
        socket.on("drawStart", async (element: WhiteboardElement) => {
          await Whiteboard.findByIdAndUpdate(whiteboardId, { $push: { elements: element } });
          socket.to(room).emit("drawStart", element);
          io.to(room).emit("activity_update", activity(`started drawing a ${element.type}`));
        });

        socket.on("drawUpdate", (element: WhiteboardElement) => {
          socket.to(room).emit("drawUpdate", element);
        });

        socket.on("drawEnd", async (element: WhiteboardElement) => {
          await Whiteboard.findByIdAndUpdate(whiteboardId, {
            $pull: { elements: { id: element.id } },
          });
          await Whiteboard.findByIdAndUpdate(whiteboardId, {
            $push: { elements: element },
          });
          socket.to(room).emit("drawEnd", element);
          io.to(room).emit("activity_update", activity(`finished drawing a ${element.type}`));
        });

        // Sticky Notes
        socket.on("stickyNoteCreate", async (note: StickyNote) => {
          await Whiteboard.findByIdAndUpdate(whiteboardId, { $push: { stickyNotes: note } });
          socket.to(room).emit("stickyNoteCreate", note);
          io.to(room).emit("activity_update", activity("created a sticky note"));
        });

        socket.on("stickyNoteUpdate", async (note: Partial<StickyNote>) => {
          if (!note.id) return;
          const fields: any = {};
          (["content", "x", "y", "width", "height", "color"] as (keyof StickyNote)[]).forEach((key) => {
            if (note[key] !== undefined) {
              fields[`stickyNotes.$.${key}`] = note[key];
            }
          });


          await Whiteboard.findOneAndUpdate(
            { _id: whiteboardId, "stickyNotes.id": note.id },
            { $set: fields },
            { new: true }
          );
          socket.to(room).emit("stickyNoteUpdated", note);
        });

        socket.on("stickyNoteDelete", async (id: string) => {
          await Whiteboard.findByIdAndUpdate(whiteboardId, {
            $pull: { stickyNotes: { id } },
          });
          socket.to(room).emit("stickyNoteDelete", id);
          io.to(room).emit("activity_update", activity("deleted a sticky note"));
        });

        // Text and Shape
        socket.on("textCreate", async (el: WhiteboardElement) => {
          await Whiteboard.findByIdAndUpdate(whiteboardId, { $push: { elements: el } });
          socket.to(room).emit("textCreate", el);
          io.to(room).emit("activity_update", activity("added text"));
        });

        socket.on("textUpdate", async (el: Partial<WhiteboardElement>) => {
          await Whiteboard.findOneAndUpdate(
            { _id: whiteboardId, "elements.id": el.id },
            {
              $set: {
                "elements.$.text": el.text,
                "elements.$.x": el.x,
                "elements.$.y": el.y,
                "elements.$.color": el.color,
              },
            },
            { new: true }
          );
          socket.to(room).emit("textUpdate", el);
          io.to(room).emit("activity_update", activity("updated text"));
        });

        socket.on("shapeUpdate", async (el: Partial<WhiteboardElement>) => {
          await Whiteboard.findOneAndUpdate(
            { _id: whiteboardId, "elements.id": el.id },
            {
              $set: {
                "elements.$.x": el.x,
                "elements.$.y": el.y,
                "elements.$.width": el.width,
                "elements.$.height": el.height,
                "elements.$.color": el.color,
                "elements.$.lineWidth": el.lineWidth,
              },
            },
            { new: true }
          );
          socket.to(room).emit("shapeUpdate", el);
          io.to(room).emit("activity_update", activity("updated a shape"));
        });

        // Cursor
        socket.on("cursorMove", ({ x, y }: { x: number; y: number }) => {
          socket.to(room).emit("cursorMove", { socketId: socket.id, username, x, y });
        });

        // Ping (Latency Check)
        socket.on("ping", (timestamp: number) => {
          socket.emit("pong", timestamp);
        });

      } catch (err) {
        console.error("Error joining whiteboard:", err);
        socket.emit("error", { message: "Something went wrong joining whiteboard" });
      }
    });

    socket.on("disconnect", () => {
      const room = socket.data.room;
      if (room && socket.data.user?.username) {
        const presence: UserPresence = {
          email: socket.data.user.email,
          username: socket.data.user.username,
          joined: false,
        };
        socket.to(room).emit("user_presence", presence);
        console.log(`❌ ${socket.data.user.username} disconnected from ${room}`);
      }
    });
  });
};
