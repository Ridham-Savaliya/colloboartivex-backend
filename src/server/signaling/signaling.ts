import { Namespace, Socket, Server } from 'socket.io';

interface JoinRoomPayload {
  roomId: string;
  userId: string;
}

interface StartCallPayload {
  roomId: string;
  userIds: string[];
  fromUserId: string;
  isTurn: boolean;
}

interface AcceptCallPayload {
  roomId: string;
  userId: string;
  fromUserId: string;
}

interface RejectCallPayload {
  roomId: string;
  userId: string;
  fromUserId: string;
}

interface SignalPayload {
  from: string;
  to: string;
  data: any;
}

interface EndCallPayload {
  roomId: string;
  userId: string;
}

interface LeaveCallPayload {
  roomId: string;
  userId: string;
}

export default function setUpVideoSignalling(io: Server) {
  const videoNamespace: Namespace = io.of('/video');
  const roomTimers = new Map<string, NodeJS.Timeout>();
  const activeCalls = new Map<string, Set<string>>();

  videoNamespace.on('connection', (socket: Socket) => {
    console.log(`[video] Socket connected: ${socket.id}`);

    socket.on('join-room', ({ roomId, userId }: JoinRoomPayload) => {
      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.userId = userId;
      console.log(`[video] ${userId} joined room ${roomId}`);
    });

    socket.on('start-call', ({ roomId, userIds, fromUserId, isTurn }: StartCallPayload) => {
      if (!activeCalls.has(roomId)) {
        activeCalls.set(roomId, new Set([fromUserId]));
        userIds.forEach((userId: string) => {
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
      } else {
        socket.emit('call-error', { message: 'A call is already active in this room.' });
      }
    });

    socket.on('accept-call', ({ roomId, userId, fromUserId }: AcceptCallPayload) => {
      if (activeCalls.has(roomId)) {
        activeCalls.get(roomId)!.add(userId);
        const participants = Array.from(activeCalls.get(roomId)!);
        videoNamespace.to(roomId).emit('user-joined-call', { userId });
        socket.emit('current-participants', { participants: participants.filter((id) => id !== userId) });
        socket.to(roomId).emit('call-accepted', { fromUserId: userId, toUserId: fromUserId });
        console.log(`[video] ${userId} accepted call in room ${roomId}`);
      } else {
        socket.emit('call-error', { message: 'No active call in this room.' });
      }
    });

    socket.on('reject-call', ({ roomId, userId, fromUserId }: RejectCallPayload) => {
      socket.to(roomId).emit('call-rejected', { fromUserId: userId, toUserId: fromUserId });
      console.log(`[video] ${userId} rejected call from ${fromUserId}`);
    });

    socket.on('signal', ({ from, to, data }: SignalPayload) => {
      const targetSocket = [...videoNamespace.sockets.values()].find(
        (s: any) => s.data.userId === to && s.data.roomId === socket.data.roomId
      );
      if (targetSocket) {
        targetSocket.emit('signal', { from, data });
      } else {
        console.warn(`[video] Target ${to} not found for signaling`);
      }
    });

    socket.on('end-call', ({ roomId, userId }: EndCallPayload) => {
      videoNamespace.to(roomId).emit('call-ended-by-owner', { reason: 'ENDED_BY_OWNER' });
      activeCalls.delete(roomId);
      if (roomTimers.has(roomId)) {
        clearTimeout(roomTimers.get(roomId)!);
        roomTimers.delete(roomId);
      }
      console.log(`[video] Call ended by owner ${userId} in room ${roomId}`);
    });

    socket.on('leave-call', ({ roomId, userId }: LeaveCallPayload) => {
      if (activeCalls.has(roomId)) {
        activeCalls.get(roomId)!.delete(userId);
        socket.to(roomId).emit('user-left-call', { userId });
        console.log(`[video] ${userId} left call in room ${roomId}`);
      }
    });

    socket.on('disconnect', () => {
      const { roomId, userId } = socket.data as { roomId?: string; userId?: string };
      if (roomId && userId && activeCalls.has(roomId)) {
        activeCalls.get(roomId)!.delete(userId);
        socket.to(roomId).emit('user-left-call', { userId });
        console.log(`[video] ${userId} disconnected from room ${roomId}`);
      }
    });
  });
}
