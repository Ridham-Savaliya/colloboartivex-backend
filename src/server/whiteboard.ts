import { Server, Socket } from "socket.io";
import User from "../models/User";
import Whiteboard from "../models/Whiteboard";
import { verifyToken } from "../lib/auth";
import connectDB from "../lib/db";
import MindMap from "../models/MindMap";
import KanbanBoard from '../models/Kanban';
import {
  WhiteboardElement,
  StickyNote,
  ActivityUpdate,
  UserPresence,
} from "./types";
import { Namespace } from "socket.io";

export const setupWhiteboard = (whiteboardNamespace: Namespace) => {
  whiteboardNamespace.on("connection", async (socket: Socket) => {
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

    // Join whiteboard room
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
        socket.data.whiteboardId = whiteboardId;

        // Send initial data
        const mindmap = await MindMap.findOne({ whiteboardId });
        socket.emit("mindmap-initial-load", {
          nodes: mindmap?.nodes || [],
          edges: mindmap?.edges || []
        });

        const presence: UserPresence = { email, username, userId, joined: true };
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
          whiteboardNamespace.to(room).emit("activity_update", activity(`started drawing a ${element.type}`));
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
          whiteboardNamespace.to(room).emit("activity_update", activity(`finished drawing a ${element.type}`));
        });

        // Sticky Notes
        socket.on("stickyNoteCreate", async (note: StickyNote) => {
          await Whiteboard.findByIdAndUpdate(whiteboardId, { $push: { stickyNotes: note } });
          socket.to(room).emit("stickyNoteCreate", note);
          whiteboardNamespace.to(room).emit("activity_update", activity("created a sticky note"));
        });

        socket.on("stickyNoteUpdate", async (note: Partial<StickyNote>) => {
          if (!note.id) return;
          const fields: any = {};
          (["text", "x", "y", "width", "height", "color"] as (keyof StickyNote)[]).forEach((key) => {
            if (note[key] !== undefined) {
              fields[`stickyNotes.$.${key}`] = note[key];
            }
          });

          await Whiteboard.findOneAndUpdate(
            { _id: whiteboardId, "stickyNotes.id": note.id },
            { $set: fields },
            { new: true }
          );
          socket.to(room).emit("stickyNoteUpdate", note);
        });

        socket.on("stickyNoteDelete", async (id: string) => {
          await Whiteboard.findByIdAndUpdate(whiteboardId, {
            $pull: { stickyNotes: { id } },
          });
          socket.to(room).emit("stickyNoteDelete", id);
          whiteboardNamespace.to(room).emit("activity_update", activity("deleted a sticky note"));
        });

        // MindMap Events
        socket.on("nodes-update", async ({ nodes }) => {
          await MindMap.findOneAndUpdate(
            { whiteboardId },
            { $set: { nodes, updatedAt: new Date() } },
            { upsert: true }
          );

          socket.to(room).emit("mindmap-nodes-update", { nodes });
        });

        socket.on("edges-update", async ({ edges }) => {
          await MindMap.findOneAndUpdate(
            { whiteboardId },
            { $set: { edges, updatedAt: new Date() } },
            { upsert: true }
          );

          socket.to(room).emit("mindmap-edges-update", { edges });
        });

        // Text and Shape
        socket.on("textCreate", async (el: WhiteboardElement) => {
          await Whiteboard.findByIdAndUpdate(whiteboardId, { $push: { elements: el } });
          socket.to(room).emit("textCreate", el);
          whiteboardNamespace.to(room).emit("activity_update", activity("added text"));
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
          whiteboardNamespace.to(room).emit("activity_update", activity("updated text"));
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
          whiteboardNamespace.to(room).emit("activity_update", activity("updated a shape"));
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

    // Join kanban board room - NEW EVENT HANDLER
    socket.on("join-kanban", async ({ whiteboard: whiteboardId }: { whiteboard: string }) => {
      try {
        await connectDB();
        
        // Verify access to the whiteboard (same logic as join_whiteboard)
        const whiteboard = await Whiteboard.findById(whiteboardId);
        if (!whiteboard) {
          socket.emit("kanban-error", { message: "Whiteboard not found" });
          return;
        }

        const isOwner = whiteboard.owner.toString() === userId;
        const isCollaborator = whiteboard.collaborators.includes(email);
        if (!isOwner && !isCollaborator) {
          socket.emit("kanban-error", { message: "Unauthorized access" });
          return;
        }

        // Join kanban-specific room
        const kanbanRoom = `kanban-${whiteboardId}`;
        socket.join(kanbanRoom);
        socket.data.kanbanRoom = kanbanRoom;
        socket.data.kanbanBoardId = whiteboardId;

        console.log(`[Kanban] User ${username} (${socket.id}) joined kanban room: ${kanbanRoom}`);

        // Get current user count in the kanban room
        const roomSockets = await whiteboardNamespace.in(kanbanRoom).fetchSockets();
        const userCount = roomSockets.length;

        // Notify user they joined successfully
        socket.emit("kanban-joined", { 
          room: kanbanRoom, 
          userCount,
          timestamp: Date.now()
        });

        // Notify other users
        socket.to(kanbanRoom).emit("kanban-user-joined", { 
          username, 
          userId, 
          userCount,
          timestamp: Date.now()
        });

        // Fetch and send initial kanban data
        const kanbanBoard = await KanbanBoard.findOne({ whiteboard: whiteboardId });
        console.log(`[Kanban] Found board for ${whiteboardId}:`, !!kanbanBoard);
        
        let columnsData:any = null;
        let success = false;

        if (kanbanBoard && kanbanBoard.columns) {
          try {
            // Convert MongoDB Map to plain object more robustly
            if (kanbanBoard.columns instanceof Map) {
              // Handle Map instance
              columnsData = Object.fromEntries(kanbanBoard.columns);
              console.log(`[Kanban] Converted Map to object, keys:`, Object.keys(columnsData));
            } else if (typeof kanbanBoard.columns === 'object' && kanbanBoard.columns !== null) {
              // Handle plain object or other object types
              columnsData = kanbanBoard.columns;
              console.log(`[Kanban] Using existing object, keys:`, Object.keys(columnsData));
            }
            
            // Validate the converted data structure
            if (columnsData && typeof columnsData === 'object') {
              const requiredColumns = ['todo', 'inProgress', 'done'];
              const hasRequiredStructure = requiredColumns.every(colId => 
                columnsData[colId] && 
                typeof columnsData[colId] === 'object' &&
                columnsData[colId].id && 
                columnsData[colId].title && 
                Array.isArray(columnsData[colId].tasks) &&
                columnsData[colId].color
              );
              
              if (hasRequiredStructure) {
                success = true;
                console.log(`[Kanban] Valid data structure confirmed for ${whiteboardId}`);
              } else {
                console.log(`[Kanban] Invalid data structure for ${whiteboardId}:`, {
                  hasRequiredCols: requiredColumns.map(id => ({
                    [id]: {
                      exists: !!columnsData[id],
                      hasId: !!(columnsData[id]?.id),
                      hasTitle: !!(columnsData[id]?.title),
                      hasTasks: Array.isArray(columnsData[id]?.tasks),
                      hasColor: !!(columnsData[id]?.color)
                    }
                  }))
                });
                columnsData = null;
              }
            }
          } catch (error) {
            console.error(`[Kanban] Error processing columns data:`, error);
            columnsData = null;
          }
        } else {
          console.log(`[Kanban] No existing board data found for ${whiteboardId}`);
        }

        // Send initial data to the connecting user
        socket.emit("kanban-initial-load", {
          columns: columnsData,
          success: success,
          timestamp: Date.now(),
          userCount
        });

        console.log(`[Kanban] Sent initial data to ${socket.id}:`, { 
          hasData: !!columnsData, 
          success,
          columnCount: columnsData ? Object.keys(columnsData).length : 0,
          userCount
        });

      } catch (error:any) {
        console.error(`[Kanban] Error joining kanban room:`, error);
        socket.emit("kanban-error", { 
          message: "Failed to join kanban board",
          code: "JOIN_ERROR",
          details: error.message 
        });
      }
    });

    // Handle kanban board updates - IMPROVED VERSION
    socket.on("kanban-update", async ({ whiteboard: whiteboardId, columns, updateId, operation, timestamp }) => {
      try {
        const kanbanRoom = `kanban-${whiteboardId}`;
        console.log(`[Kanban] Updating board ${whiteboardId} from user ${socket.id}`, {
          updateId,
          operation,
          columnCount: columns ? Object.keys(columns).length : 0,
          room: kanbanRoom
        });

        // Validate input data
        if (!whiteboardId || !columns || typeof columns !== "object") {
          throw new Error("Missing or invalid required fields");
        }

        // Validate that we have the required columns structure
        const requiredColumns = ['todo', 'inProgress', 'done'];
        const hasRequiredStructure = requiredColumns.every(colId => 
          columns[colId] && 
          typeof columns[colId] === 'object' &&
          columns[colId].id && 
          columns[colId].title && 
          Array.isArray(columns[colId].tasks) &&
          columns[colId].color
        );

        if (!hasRequiredStructure) {
          throw new Error("Invalid column structure - missing required columns or fields");
        }

        // Additional validation for tasks
        for (const [colId, column] of Object.entries(columns)) {
          if (!Array.isArray(column.tasks)) continue;
          
          for (const task of column.tasks) {
            if (!task.id || !task.content || !task.createdAt) {
              throw new Error(`Invalid task structure in column ${colId}`);
            }
          }
        }

        // Convert plain object to Map for MongoDB storage (MongoDB requires Map for this schema)
        const columnsMap = new Map(Object.entries(columns));

        // Save to database with upsert
        const updatedBoard = await KanbanBoard.findOneAndUpdate(
          { whiteboard: whiteboardId },
          { 
            $set: { 
              columns: columnsMap,
              updatedAt: new Date() 
            } 
          },
          { 
            upsert: true, 
            new: true,
            runValidators: true
          }
        );

        console.log(`[Kanban] Successfully saved board ${whiteboardId} to database`);

        // Send confirmation back to the sender
        socket.emit("kanban-save-confirmed", {
          updateId: updateId,
          success: true,
          timestamp: Date.now()
        });

        // Broadcast update to all other clients in the room (excluding sender)
        socket.to(kanbanRoom).emit("kanban-columns-update", {
          columns: columns, // Send as plain object, not Map
          updateId: updateId,
          operation: operation || 'update',
          timestamp: timestamp || Date.now(),
          sourceSocketId: socket.id,
          sourceUser: username
        });

        console.log(`[Kanban] Broadcasted update for board ${whiteboardId} to room ${kanbanRoom}`);

        // Update user count and notify about activity
        const roomSockets = await whiteboardNamespace.in(kanbanRoom).fetchSockets();
        const currentUserCount = roomSockets.length;
        
        whiteboardNamespace.to(kanbanRoom).emit("kanban-user-activity", {
          username,
          operation,
          userCount: currentUserCount,
          timestamp: Date.now()
        });

      } catch (error:any) {
        console.error(`[Kanban] Error updating board ${whiteboardId}:`, error);
        
        // Send detailed error back to the client that made the update
        socket.emit("kanban-error", { 
          message: "Failed to update board",
          code: "UPDATE_ERROR",
          details: error.message,
          updateId: updateId,
          timestamp: Date.now()
        });
      }
    });

    socket.on("disconnect", async () => {
      const room = socket.data.room;
      const kanbanRoom = socket.data.kanbanRoom;
      
      if (room && socket.data.user?.username) {
        const presence: UserPresence = {
          email: socket.data.user.email,
          username: socket.data.user.username,
          userId: socket.data.user.userId,
          joined: false,
        };
        socket.to(room).emit("user_presence", presence);
        console.log(`❌ ${socket.data.user.username} disconnected from ${room}`);
      }

      // Handle kanban room disconnect
      if (kanbanRoom && socket.data.user?.username) {
        try {
          const roomSockets = await whiteboardNamespace.in(kanbanRoom).fetchSockets();
          const remainingUserCount = roomSockets.length - 1; // Subtract 1 for the disconnecting user
          
          socket.to(kanbanRoom).emit("kanban-user-left", { 
            username: socket.data.user.username,
            userId: socket.data.user.userId,
            userCount: Math.max(0, remainingUserCount),
            timestamp: Date.now()
          });
          
          console.log(`❌ ${socket.data.user.username} disconnected from kanban room ${kanbanRoom}`);
        } catch (error) {
          console.error("Error handling kanban room disconnect:", error);
        }
      }
    });
  });
};