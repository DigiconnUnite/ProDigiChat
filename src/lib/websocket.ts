import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

let io: SocketIOServer | null = null;

export function initializeWebSocket(server: HTTPServer) {
  if (io) {
    return io;
  }

  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('[WebSocket] Client connected:', socket.id);

    socket.on('join-organization', (organizationId: string) => {
      socket.join(`org:${organizationId}`);
      console.log('[WebSocket] Client joined organization:', organizationId);
    });

    socket.on('leave-organization', (organizationId: string) => {
      socket.leave(`org:${organizationId}`);
      console.log('[WebSocket] Client left organization:', organizationId);
    });

    socket.on('join-inbox', (organizationId: string) => {
      socket.join(`inbox:${organizationId}`);
      console.log('[WebSocket] Client joined inbox:', organizationId);
    });

    socket.on('disconnect', () => {
      console.log('[WebSocket] Client disconnected:', socket.id);
    });
  });

  return io;
}

export function getWebSocket(): SocketIOServer | null {
  return io;
}

export function broadcastToOrganization(organizationId: string, event: string, data: any) {
  if (!io) {
    console.warn('[WebSocket] WebSocket not initialized');
    return;
  }

  io.to(`org:${organizationId}`).emit(event, data);
}

export function broadcastToInbox(organizationId: string, event: string, data: any) {
  if (!io) {
    console.warn('[WebSocket] WebSocket not initialized');
    return;
  }

  io.to(`inbox:${organizationId}`).emit(event, data);
}
