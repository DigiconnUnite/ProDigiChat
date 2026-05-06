const { Server: SocketIOServer } = require('socket.io');

let io = null;

function initializeWebSocket(server) {
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

    socket.on('join-organization', (organizationId) => {
      socket.join(`org:${organizationId}`);
      console.log('[WebSocket] Client joined organization:', organizationId);
    });

    socket.on('leave-organization', (organizationId) => {
      socket.leave(`org:${organizationId}`);
      console.log('[WebSocket] Client left organization:', organizationId);
    });

    socket.on('join-inbox', (organizationId) => {
      socket.join(`inbox:${organizationId}`);
      console.log('[WebSocket] Client joined inbox:', organizationId);
    });

    socket.on('disconnect', () => {
      console.log('[WebSocket] Client disconnected:', socket.id);
    });
  });

  return io;
}

function getWebSocket() {
  return io;
}

function broadcastToOrganization(organizationId, event, data) {
  if (!io) {
    console.warn('[WebSocket] WebSocket not initialized');
    return;
  }

  io.to(`org:${organizationId}`).emit(event, data);
}

function broadcastToInbox(organizationId, event, data) {
  if (!io) {
    console.warn('[WebSocket] WebSocket not initialized');
    return;
  }

  io.to(`inbox:${organizationId}`).emit(event, data);
}

module.exports = {
  initializeWebSocket,
  getWebSocket,
  broadcastToOrganization,
  broadcastToInbox
};
