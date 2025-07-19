import { Namespace, Socket } from 'socket.io';
import { Server } from 'socket.io'; // Make sure Server is imported

export const setupSocket = (namespace: Namespace, io: Server) => { // 'io' parameter is important
    namespace.on('connection', (socket) => {
        console.log(`[SERVER DEBUG] New collaborate socket connected: ${socket.id} at ${new Date().toISOString()}`);

        socket.on('join-collaborateRoom', ({ roomId, userId }) => {
            if (!roomId || !userId) {
                console.error(`[SERVER DEBUG] Invalid join-collaborateRoom data: roomId=${roomId}, userId=${userId}`);
                return;
            }
            console.log(`[SERVER DEBUG] User ${userId} joining collaborate room ${roomId} with socket ${socket.id}`);
            socket.join(roomId);
            namespace.to(roomId).emit('user-joined', userId);
            console.log(`[SERVER DEBUG] Broadcasted user-joined for ${userId} in collaborate room ${roomId}`);

            // Removed: Video room sync logic. The video client handles its own join.
        });

        socket.on('leave-collaborateRoom', ({ roomId, userId }) => {
            console.log(`[SERVER DEBUG] User ${userId} leaving collaborate room ${roomId} with socket ${socket.id}`);
            socket.leave(roomId);
            namespace.to(roomId).emit('user-left', userId);
            console.log(`[SERVER DEBUG] Broadcasted user-left for ${userId} in collaborate room ${roomId}`);

            // Removed: Video room sync logic. The video client handles its own end-call.
        });

        socket.on('disconnect', () => {
            console.log(`[SERVER DEBUG] Collaborate socket disconnected: ${socket.id} at ${new Date().toISOString()}`);
            const rooms = socket.rooms;
            rooms.forEach((roomId) => {
                if (roomId !== socket.id) {
                    // Note: This emits the socket.id, not userId.
                    // If you need userId here, you'd need to store it on `socket.data` in this namespace too.
                    namespace.to(roomId).emit('user-left', socket.id);
                    console.log(`[SERVER DEBUG] Broadcasted user-left for ${socket.id} in room ${roomId}`);

                    // Removed: Video room sync logic. The video client's disconnect handler will manage this.
                }
            });
        });
    });
};

export default setupSocket;
