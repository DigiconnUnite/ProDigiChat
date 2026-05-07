import { EventEmitter } from 'events';

// Serverless-compatible event emitter for real-time features
// This replaces Socket.IO with a simple in-memory solution that works in serverless environments
class ServerlessWebSocket extends EventEmitter {
  private organizationRooms: Map<string, Set<string>> = new Map();
  private inboxRooms: Map<string, Set<string>> = new Map();
  private clientSockets: Map<string, any> = new Map();

  constructor() {
    super();
    console.log('[ServerlessWebSocket] Initialized serverless-compatible WebSocket');
  }

  // Simulate socket connection for serverless environment
  createConnection(socketId: string, organizationId?: string) {
    const socket = {
      id: socketId,
      organizationId,
      join: (room: string) => this.joinRoom(socketId, room),
      leave: (room: string) => this.leaveRoom(socketId, room),
      disconnect: () => this.disconnect(socketId),
    };

    this.clientSockets.set(socketId, socket);
    
    if (organizationId) {
      this.joinRoom(socketId, `org:${organizationId}`);
      this.joinRoom(socketId, `inbox:${organizationId}`);
    }

    console.log('[ServerlessWebSocket] Client connected:', socketId);
    this.emit('connection', socket);
    
    return socket;
  }

  private joinRoom(socketId: string, room: string) {
    if (room.startsWith('org:')) {
      const orgId = room.replace('org:', '');
      if (!this.organizationRooms.has(orgId)) {
        this.organizationRooms.set(orgId, new Set());
      }
      this.organizationRooms.get(orgId)!.add(socketId);
    } else if (room.startsWith('inbox:')) {
      const orgId = room.replace('inbox:', '');
      if (!this.inboxRooms.has(orgId)) {
        this.inboxRooms.set(orgId, new Set());
      }
      this.inboxRooms.get(orgId)!.add(socketId);
    }
  }

  private leaveRoom(socketId: string, room: string) {
    if (room.startsWith('org:')) {
      const orgId = room.replace('org:', '');
      this.organizationRooms.get(orgId)?.delete(socketId);
    } else if (room.startsWith('inbox:')) {
      const orgId = room.replace('inbox:', '');
      this.inboxRooms.get(orgId)?.delete(socketId);
    }
  }

  private disconnect(socketId: string) {
    this.clientSockets.delete(socketId);
    
    // Remove from all rooms
    for (const [orgId, sockets] of this.organizationRooms) {
      sockets.delete(socketId);
    }
    for (const [orgId, sockets] of this.inboxRooms) {
      sockets.delete(socketId);
    }
    
    console.log('[ServerlessWebSocket] Client disconnected:', socketId);
    this.emit('disconnect', socketId);
  }

  // Broadcast to organization room
  broadcastToOrganization(organizationId: string, event: string, data: any) {
    const room = `org:${organizationId}`;
    const sockets = this.organizationRooms.get(organizationId);
    
    if (!sockets || sockets.size === 0) {
      console.log(`[ServerlessWebSocket] No clients in organization room: ${organizationId}`);
      return;
    }

    console.log(`[ServerlessWebSocket] Broadcasting to organization ${organizationId}:`, { event, clientCount: sockets.size });
    
    // In a real implementation, this would push to a queue or use Server-Sent Events
    // For now, we'll emit the event internally
    this.emit(`org:${organizationId}:${event}`, data);
    
    // Store the last message for polling clients
    this.lastOrgMessages = this.lastOrgMessages || new Map();
    this.lastOrgMessages.set(`${organizationId}:${event}`, { data, timestamp: Date.now() });
  }

  // Broadcast to inbox room  
  broadcastToInbox(organizationId: string, event: string, data: any) {
    const room = `inbox:${organizationId}`;
    const sockets = this.inboxRooms.get(organizationId);
    
    if (!sockets || sockets.size === 0) {
      console.log(`[ServerlessWebSocket] No clients in inbox room: ${organizationId}`);
      return;
    }

    console.log(`[ServerlessWebSocket] Broadcasting to inbox ${organizationId}:`, { event, clientCount: sockets.size });
    
    // In a real implementation, this would push to a queue or use Server-Sent Events
    // For now, we'll emit the event internally
    this.emit(`inbox:${organizationId}:${event}`, data);
    
    // Store the last message for polling clients
    this.lastInboxMessages = this.lastInboxMessages || new Map();
    this.lastInboxMessages.set(`${organizationId}:${event}`, { data, timestamp: Date.now() });
  }

  // Get last message for polling (serverless-compatible alternative to WebSockets)
  getLastMessage(organizationId: string, room: 'org' | 'inbox', event: string) {
    const key = `${organizationId}:${event}`;
    const messages = room === 'org' ? this.lastOrgMessages : this.lastInboxMessages;
    return messages?.get(key) || null;
  }

  // Get all recent messages for an organization
  getRecentMessages(organizationId: string, since?: number): Array<{ room: string; event: string; data: any; timestamp: number }> {
    const cutoff = since || (Date.now() - 60000); // Default to last minute
    const messages: Array<{ room: string; event: string; data: any; timestamp: number }> = [];
    
    // Check org messages
    if (this.lastOrgMessages) {
      for (const [key, message] of this.lastOrgMessages) {
        if (key.startsWith(`${organizationId}:`) && message.timestamp > cutoff) {
          messages.push({ room: 'org', event: key.replace(`${organizationId}:`, ''), data: message.data, timestamp: message.timestamp });
        }
      }
    }
    
    // Check inbox messages
    if (this.lastInboxMessages) {
      for (const [key, message] of this.lastInboxMessages) {
        if (key.startsWith(`${organizationId}:`) && message.timestamp > cutoff) {
          messages.push({ room: 'inbox', event: key.replace(`${organizationId}:`, ''), data: message.data, timestamp: message.timestamp });
        }
      }
    }
    
    return messages;
  }

  private lastOrgMessages?: Map<string, { data: any; timestamp: number }>;
  private lastInboxMessages?: Map<string, { data: any; timestamp: number }>;
}

// Singleton instance
const serverlessWebSocket = new ServerlessWebSocket();

export function initializeWebSocket() {
  return serverlessWebSocket;
}

export function getWebSocket() {
  return serverlessWebSocket;
}

export function broadcastToOrganization(organizationId: string, event: string, data: any) {
  serverlessWebSocket.broadcastToOrganization(organizationId, event, data);
}

export function broadcastToInbox(organizationId: string, event: string, data: any) {
  serverlessWebSocket.broadcastToInbox(organizationId, event, data);
}

// Additional exports for serverless compatibility
export { ServerlessWebSocket };
