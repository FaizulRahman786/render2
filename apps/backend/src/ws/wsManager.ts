// SSE (Server-Sent Events) manager — replaces WebSocket for real-time notifications.
// SSE is pure HTTP, works through any proxy (including Replit's), and is server-to-client only
// which is exactly what the notification system needs.

import type { Response } from 'express';

interface SseClient {
  res: Response;
  userId: string;
  role: string;
}

const clients = new Map<string, Set<SseClient>>();

// Maximum concurrent SSE connections per user (handles multiple tabs)
const MAX_CONNECTIONS_PER_USER = 5;

// Heartbeat interval to detect dead connections
const HEARTBEAT_INTERVAL_MS = 30_000;

function addClient(userId: string, role: string, res: Response): SseClient {
  const client: SseClient = { res, userId, role };
  if (!clients.has(userId)) clients.set(userId, new Set());
  const userClients = clients.get(userId)!;

  // If the user already has the maximum number of connections, close the oldest one
  if (userClients.size >= MAX_CONNECTIONS_PER_USER) {
    const [oldest] = userClients;
    try { oldest.res.end(); } catch {}
    userClients.delete(oldest);
  }

  userClients.add(client);
  return client;
}

function removeClient(userId: string, client: SseClient) {
  clients.get(userId)?.delete(client);
  if (clients.get(userId)?.size === 0) clients.delete(userId);
}

function send(client: SseClient, event: object) {
  try {
    client.res.write(`data: ${JSON.stringify(event)}\n\n`);
  } catch {}
}

// Heartbeat to keep connections alive and detect stale ones
let heartbeatInterval: NodeJS.Timeout | null = null;
function startHeartbeat() {
  if (heartbeatInterval) return;
  heartbeatInterval = setInterval(() => {
    clients.forEach((userClients, userId) => {
      userClients.forEach((client) => {
        try {
          client.res.write(': ping\n\n');
        } catch {
          removeClient(userId, client);
        }
      });
    });
  }, HEARTBEAT_INTERVAL_MS);
  heartbeatInterval.unref();
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// Register an SSE connection. Returns a cleanup function.
export function registerSseClient(userId: string, role: string, res: Response): () => void {
  startHeartbeat();
  const client = addClient(userId, role, res);
  // Send a connected acknowledgement
  send(client, { type: 'connected', userId, role });
  return () => removeClient(userId, client);
}

// Send a notification event to a specific user (all their open tabs)
export function emitToUser(userId: string, event: object) {
  const payload = { type: 'notification', data: event };
  clients.get(userId)?.forEach((c) => send(c, payload));
}

// Send to all clients of a given role
export function emitToRole(role: string, event: object) {
  const payload = { type: 'notification', data: event };
  clients.forEach((userClients) => {
    userClients.forEach((c) => {
      if (c.role === role) send(c, payload);
    });
  });
}

// Send to a list of userIds
export function emitToUsers(userIds: string[], event: object) {
  const payload = { type: 'notification', data: event };
  userIds.forEach((uid) => {
    clients.get(uid)?.forEach((c) => send(c, payload));
  });
}

// Broadcast to every connected client
export function emitToAll(event: object) {
  const payload = { type: 'notification', data: event };
  clients.forEach((userClients) => {
    userClients.forEach((c) => send(c, payload));
  });
}

export function getSseStats() {
  let total = 0;
  clients.forEach((s) => { total += s.size; });
  return { connectedUsers: clients.size, totalConnections: total };
}

export { stopHeartbeat };
