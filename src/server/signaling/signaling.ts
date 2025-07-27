import { Namespace, Socket, Server } from 'socket.io';

interface JoinRoomPayload {
  roomId: string;
  userId: string;
}

interface StartCallPayload {
  roomId: string;
  userIds: string[];
  fromUserId: string;
  fromUsername: string; // ADDED: To display the caller's name
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

interface RoomData {
  participants: Set<string>;
  owner: string;
  startTime: number;
}

export default function setUpVideoSignalling(io: Server) {
  const videoNamespace: Namespace = io.of('/video');
  const activeCalls = new Map<string, RoomData>();
  const userSocketMap = new Map<string, string>(); // userId -> socketId mapping

  videoNamespace.on('connection', (socket: Socket) => {
    console.log(`[video] Socket connected: ${socket.id}`);

    // Enhanced room joining with better error handling
    socket.on('join-room', ({ roomId, userId }: JoinRoomPayload) => {
      try {
        // Leave previous rooms
        const previousRooms = Array.from(socket.rooms).filter(room => room !== socket.id);
        previousRooms.forEach(room => {
          socket.leave(room);
          console.log(`[video] ${userId} left previous room ${room}`);
        });

        // Join new room
        socket.join(roomId);
        socket.data.roomId = roomId;
        socket.data.userId = userId;
        userSocketMap.set(userId, socket.id);

        console.log(`[video] ${userId} joined room ${roomId}`);

        // Notify about successful room join
        socket.emit('room-joined', { roomId, userId });
      } catch (error) {
        console.error(`[video] Error joining room:`, error);
        socket.emit('call-error', { message: 'Failed to join room' });
      }
    });

// MODIFIED: Call starting logic
    socket.on('start-call', ({ roomId, userIds, fromUserId, fromUsername, isTurn }: StartCallPayload) => {
      try {
        if (activeCalls.has(roomId)) {
          socket.emit('call-error', { message: 'A call is already active in this room.' });
          return;
        }

        if (userIds.length > 3) {
          socket.emit('call-error', { message: 'Maximum 4 participants allowed in a group call.' });
          return;
        }

        const roomData: RoomData = {
          participants: new Set([fromUserId]),
          owner: fromUserId,
          startTime: Date.now(),
        };
        activeCalls.set(roomId, roomData);

        // Send 'incoming-call' to each target user with the username
        userIds.forEach((userId: string) => {
          const targetSocketId = userSocketMap.get(userId);
          if (targetSocketId) {
            const targetSocket = videoNamespace.sockets.get(targetSocketId);
            if (targetSocket) {
              // MODIFIED: Emitting 'fromUsername' in the payload
              targetSocket.emit('incoming-call', {
                roomId,
                toUserId: userId,
                fromUserId,
                fromUsername, // <-- Pass the caller's name
                isTurn,
              });
              console.log(`[video] Sent incoming call to ${userId} from ${fromUsername}`);
            }
          }
        });

        // REMOVED: The entire timeout block for TURN servers is gone.
        // The call will no longer automatically end after 2 minutes.

        console.log(`[video] Call started by ${fromUserId} (${fromUsername}) in room ${roomId} with users:`, userIds);
      } catch (error) {
        console.error(`[video] Error starting call:`, error);
        socket.emit('call-error', { message: 'Failed to start call' });
      }
    });



    // Enhanced call acceptance with participant management
    socket.on('accept-call', ({ roomId, userId, fromUserId }: AcceptCallPayload) => {
      try {
        const roomData = activeCalls.get(roomId);
        if (!roomData) {
          socket.emit('call-error', { message: 'No active call in this room.' });
          return;
        }

        // Add user to participants
        roomData.participants.add(userId);

        // Get current participants list
        const participants = Array.from(roomData.participants);

        // Notify all participants about the new joiner
        videoNamespace.to(roomId).emit('user-joined-call', { userId });

        // Send current participants to the new joiner
        socket.emit('current-participants', {
          participants: participants.filter(id => id !== userId)
        });

        // Notify the caller that their call was accepted
        const callerSocketId = userSocketMap.get(fromUserId);
        if (callerSocketId) {
          const callerSocket = videoNamespace.sockets.get(callerSocketId);
          if (callerSocket) {
            callerSocket.emit('call-accepted', { fromUserId: userId, toUserId: fromUserId });
          }
        }

        console.log(`[video] ${userId} accepted call in room ${roomId}. Participants:`, participants);
      } catch (error) {
        console.error(`[video] Error accepting call:`, error);
        socket.emit('call-error', { message: 'Failed to accept call' });
      }
    });

    // Enhanced call rejection
    socket.on('reject-call', ({ roomId, userId, fromUserId }: RejectCallPayload) => {
      try {
        // Notify the caller about rejection
        const callerSocketId = userSocketMap.get(fromUserId);
        if (callerSocketId) {
          const callerSocket = videoNamespace.sockets.get(callerSocketId);
          if (callerSocket) {
            callerSocket.emit('call-rejected', { fromUserId: userId, toUserId: fromUserId });
          }
        }

        console.log(`[video] ${userId} rejected call from ${fromUserId} in room ${roomId}`);
      } catch (error) {
        console.error(`[video] Error rejecting call:`, error);
      }
    });

    // Enhanced WebRTC signaling with better error handling
    socket.on('signal', ({ from, to, data }: SignalPayload) => {
      try {
        const targetSocketId = userSocketMap.get(to);
        if (targetSocketId) {
          const targetSocket = videoNamespace.sockets.get(targetSocketId);
          if (targetSocket && targetSocket.data.roomId === socket.data.roomId) {
            targetSocket.emit('signal', { from, data });
            console.log(`[video] Relayed ${data.type || 'signal'} from ${from} to ${to}`);
          } else {
            console.warn(`[video] Target ${to} not found or not in same room for signaling`);
            socket.emit('signal-error', {
              message: 'Target user not available for signaling',
              targetUserId: to
            });
          }
        } else {
          console.warn(`[video] Target socket for ${to} not found`);
          socket.emit('signal-error', {
            message: 'Target user not connected',
            targetUserId: to
          });
        }
      } catch (error) {
        console.error(`[video] Error handling signal:`, error);
        socket.emit('signal-error', { message: 'Failed to relay signal' });
      }
    });

    // Enhanced call ending by owner
    socket.on('end-call', ({ roomId, userId }: EndCallPayload) => {
      try {
        const roomData = activeCalls.get(roomId);
        if (!roomData) {
          socket.emit('call-error', { message: 'No active call to end.' });
          return;
        }

        // Check if user is the owner
        if (roomData.owner !== userId) {
          socket.emit('call-error', { message: 'Only the call owner can end the call.' });
          return;
        }

       

        // Notify all participants
        videoNamespace.to(roomId).emit('call-ended-by-owner', {
          reason: 'ENDED_BY_OWNER',
          message: 'Call ended by the host'
        });

        // Clean up
        activeCalls.delete(roomId);
        console.log(`[video] Call ended by owner ${userId} in room ${roomId}`);
      } catch (error) {
        console.error(`[video] Error ending call:`, error);
        socket.emit('call-error', { message: 'Failed to end call' });
      }
    });

    // Enhanced individual user leaving
    socket.on('leave-call', ({ roomId, userId }: LeaveCallPayload) => {
      try {
        const roomData = activeCalls.get(roomId);
        if (roomData) {
          roomData.participants.delete(userId);

          // Notify others about user leaving
          socket.to(roomId).emit('user-left-call', { userId });

          // If owner left, end the call
          if (roomData.owner === userId) {
            // if (roomData.timer) {
            //   clearTimeout(roomData.timer);
            // }
            videoNamespace.to(roomId).emit('call-ended-by-owner', {
              reason: 'OWNER_LEFT',
              message: 'Call ended because the host left'
            });
            activeCalls.delete(roomId);
            console.log(`[video] Call ended because owner ${userId} left room ${roomId}`);
          } else {
            console.log(`[video] ${userId} left call in room ${roomId}`);
          }
        }
      } catch (error) {
        console.error(`[video] Error leaving call:`, error);
      }
    });

    // Enhanced disconnect handling
    socket.on('disconnect', () => {
      try {
        const { roomId, userId } = socket.data as { roomId?: string; userId?: string };

        if (userId) {
          userSocketMap.delete(userId);
        }

        if (roomId && userId) {
          const roomData = activeCalls.get(roomId);
          if (roomData) {
            roomData.participants.delete(userId);

            // Notify others about disconnection
            socket.to(roomId).emit('user-left-call', { userId });

            // If owner disconnected, end the call
            if (roomData.owner === userId) {
              // if (roomData.timer) {
              //   clearTimeout(roomData.timer);
              // }
              videoNamespace.to(roomId).emit('call-ended-by-owner', {
                reason: 'OWNER_DISCONNECTED',
                message: 'Call ended because the host disconnected'
              });
              activeCalls.delete(roomId);
              console.log(`[video] Call ended because owner ${userId} disconnected from room ${roomId}`);
            } else {
              console.log(`[video] ${userId} disconnected from room ${roomId}`);
            }
          }
        }

        console.log(`[video] Socket ${socket.id} disconnected`);
      } catch (error) {
        console.error(`[video] Error handling disconnect:`, error);
      }
    });

    // Health check endpoint for monitoring
    socket.on('ping', () => {
      socket.emit('pong', {
        timestamp: Date.now(),
        activeCalls: activeCalls.size,
        connectedUsers: userSocketMap.size
      });
    });
  });

  // Cleanup function for server shutdown
  const cleanup = () => {
    activeCalls.forEach((roomData, roomId) => {
      // if (roomData.timer) {
      //   clearTimeout(roomData.timer);
      // }
    });
    activeCalls.clear();
    userSocketMap.clear();
    console.log('[video] Video signaling cleaned up');
  };

  return cleanup;
}