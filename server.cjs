const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Initialize Socket.IO
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  });

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join user-specific room for authentication
    socket.on('join', (userId) => {
      if (userId) {
        socket.join(`user_${userId}`);
        console.log(`User ${userId} joined room user_${userId}`);
      }
    });

    // Handle sending messages
    socket.on('send_message', (data) => {
      console.log('Message sent:', data);
      // Broadcast to all clients in the same room (could be conversation room)
      // For now, broadcast to all connected clients
      socket.broadcast.emit('new_message', data);
    });

    // Handle campaign updates
    socket.on('campaign_update', (data) => {
      socket.broadcast.emit('campaign_status_update', data);
    });

    // Handle automation triggers
    socket.on('automation_trigger', (data) => {
      socket.broadcast.emit('automation_event', data);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  // Store io instance globally for use in API routes
  global.io = io;

  httpServer.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Socket.IO server initialized`);
  });
}).catch((ex) => {
  console.error(ex.stack);
  process.exit(1);
});
