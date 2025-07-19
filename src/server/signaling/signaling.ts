import { Namespace, Socket, Server } from 'socket.io';

type SinglePayload = {
  from: string;
  to: string;
  data: any;
};

type StartCallPayload = {
  roomId: string;
  userIds: string[];
  fromUserId: string;
  isTurn: boolean;
};

export default function setUpVideoSignalling(io: Server) {
  const videoNamespace = io.of('/video');
  const roomTimers = new Map();
  const activeCalls = new Map(); // roomId -> Set of userIds

  videoNamespace.on('connection', (socket) => {
    console.log(`[video] Socket connected: ${socket.id}`);

    socket.on('join-room', ({ roomId, userId }) => {
      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.userId = userId;
      console.log(`[video] ${userId} joined room ${roomId}`);
    });

    socket.on('start-call', ({ roomId, userIds, fromUserId, isTurn }) => {
      if (!activeCalls.has(roomId)) activeCalls.set(roomId, new Set());
      activeCalls.get(roomId).add(fromUserId);
      userIds.forEach((userId:any) => {
        videoNamespace.to(roomId).emit('incoming-call', { roomId, toUserId: userId, fromUserId });
      });
      if (isTurn) {
        const timer = setTimeout(() => {
          videoNamespace.to(roomId).emit('call-ended-by-owner', { reason: 'TURN_TIMEOUT' });
          activeCalls.delete(roomId);
          roomTimers.delete(roomId);
          console.log(`[video] Call in room ${roomId} ended due to TURN timeout`);
        }, 2 * 60 * 1000);
        roomTimers.set(roomId, timer);
      }
      console.log(`[video] Call started by ${fromUserId} in room ${roomId}`);
    });

    socket.on('accept-call', ({ roomId, userId, fromUserId }) => {
      if (!activeCalls.has(roomId)) activeCalls.set(roomId, new Set());
      activeCalls.get(roomId).add(userId);
      const participants = Array.from(activeCalls.get(roomId));
      participants.forEach((participantId) => {
        if (participantId !== userId) {
          videoNamespace.to(roomId).emit('user-joined-call', { userId, roomId });
        }
      });
      socket.emit('current-participants', { participants: participants.filter((id) => id !== userId), roomId });
      socket.to(roomId).emit('call-accepted', { fromUserId: userId, toUserId: fromUserId });
      console.log(`[video] ${userId} accepted call in room ${roomId}`);
    });

    socket.on('reject-call', ({ roomId, userId, fromUserId }) => {
      socket.to(roomId).emit('call-rejected', { fromUserId: userId, toUserId: fromUserId });
      console.log(`[video] ${userId} rejected call from ${fromUserId}`);
    });

    socket.on('signal', ({ from, to, data }) => {
      const targetSocket = [...videoNamespace.sockets.values()].find(
        (s) => s.data.userId === to && s.data.roomId === socket.data.roomId
      );
      if (targetSocket) {
        targetSocket.emit('signal', { from, data });
      } else {
        console.warn(`[video] Target ${to} not found for signaling`);
      }
    });

    socket.on('end-call', ({ roomId, userId }) => {
      videoNamespace.to(roomId).emit('call-ended-by-owner', { reason: 'ENDED_BY_OWNER' });
      activeCalls.delete(roomId);
      if (roomTimers.has(roomId)) {
        clearTimeout(roomTimers.get(roomId));
        roomTimers.delete(roomId);
      }
      console.log(`[video] Call ended by owner ${userId} in room ${roomId}`);
    });

    socket.on('leave-call', ({ roomId, userId }) => {
      if (activeCalls.has(roomId)) {
        activeCalls.get(roomId).delete(userId);
        socket.to(roomId).emit('user-left-call', { userId });
        console.log(`[video] ${userId} left call in room ${roomId}`);
      }
    });

    socket.on('disconnect', () => {
      const { roomId, userId } = socket.data;
      if (roomId && userId && activeCalls.has(roomId)) {
        activeCalls.get(roomId).delete(userId);
        socket.to(roomId).emit('user-left-call', { userId });
        console.log(`[video] ${userId} disconnected from room ${roomId}`);
      }
    });
  });
}
