const http = require('http');
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3002;

const app = express();
app.use(cors());
app.use(express.json());

// In-memory room storage
// rooms: Map<roomId, { clients: Set<WebSocket>, users: Map<WebSocket, userInfo> }>
const rooms = new Map();

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      clients: new Set(),
      users: new Map()
    });
  }
  return rooms.get(roomId);
}

function buildUsersList(room) {
  const users = [];
  for (const [, userInfo] of room.users.entries()) {
    users.push({
      userId: userInfo.userId,
      name: userInfo.name,
      avatar: userInfo.avatar,
      role: userInfo.role
    });
  }
  return users;
}

function safeSend(ws, data) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

// REST: POST /run (mock implementation)
app.post('/run', (req, res) => {
  const { roomId, code, language, stdin, timeoutMs } = req.body || {};

  // For now just echo back the request as a successful "run"
  res.json({
    stdout: '// mock run output',
    stderr: '',
    exitCode: 0,
    durationMs: 10,
    meta: {
      roomId: roomId || null,
      language: language || 'ts',
      timeoutMs: timeoutMs || null,
      receivedStdin: typeof stdin === 'string'
    }
  });
});

// REST: POST /ai-review (mock implementation)
app.post('/ai-review', (req, res) => {
  const { code, language } = req.body || {};

  res.json({
    summary: 'Mock AI review: no issues found.',
    comments: []
  });
});

// Basic health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'realtime-backend' });
});

const server = http.createServer(app);

// WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.currentRoomId = null;
  ws.currentUserId = null;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch (e) {
      safeSend(ws, {
        type: 'error',
        roomId: null,
        payload: {
          code: 'INVALID_JSON',
          message: 'Cannot parse incoming message as JSON'
        }
      });
      return;
    }

    const { type, roomId, userId, payload } = msg;

    if (!type || !roomId || !userId) {
      safeSend(ws, {
        type: 'error',
        roomId: roomId || null,
        payload: {
          code: 'INVALID_MESSAGE',
          message: 'Message must contain type, roomId and userId'
        }
      });
      return;
    }

    const room = getRoom(roomId);

    switch (type) {
      case 'join_room': {
        ws.currentRoomId = roomId;
        ws.currentUserId = userId;

        room.clients.add(ws);
        const userInfo = {
          userId,
          name: payload?.name || `User-${userId}`,
          avatar: payload?.avatar || null,
          role: payload?.role || 'editor'
        };
        room.users.set(ws, userInfo);

        const users = buildUsersList(room);

        // Broadcast user_joined to everyone in room
        const event = {
          type: 'user_joined',
          roomId,
          userId,
          payload: {
            ...userInfo,
            users
          }
        };

        for (const client of room.clients) {
          safeSend(client, event);
        }
        break;
      }

      case 'leave_room': {
        if (room.clients.has(ws)) {
          room.clients.delete(ws);
          room.users.delete(ws);
        }

        const users = buildUsersList(room);

        const event = {
          type: 'user_left',
          roomId,
          userId,
          payload: { users }
        };

        for (const client of room.clients) {
          safeSend(client, event);
        }

        ws.currentRoomId = null;
        ws.currentUserId = null;
        break;
      }

      case 'code_update': {
        // Relay to all other clients in the same room
        const event = {
          type: 'code_update',
          roomId,
          userId,
          payload
        };

        for (const client of room.clients) {
          if (client !== ws) {
            safeSend(client, event);
          }
        }
        break;
      }

      case 'cursor_update': {
        const event = {
          type: 'cursor_update',
          roomId,
          userId,
          payload
        };

        for (const client of room.clients) {
          if (client !== ws) {
            safeSend(client, event);
          }
        }
        break;
      }

      default: {
        safeSend(ws, {
          type: 'error',
          roomId,
          payload: {
            code: 'UNKNOWN_TYPE',
            message: `Unknown message type: ${type}`
          }
        });
      }
    }
  });

  ws.on('close', () => {
    const roomId = ws.currentRoomId;
    const userId = ws.currentUserId;

    if (!roomId || !userId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    if (room.clients.has(ws)) {
      room.clients.delete(ws);
      room.users.delete(ws);
    }

    const users = buildUsersList(room);

    const event = {
      type: 'user_left',
      roomId,
      userId,
      payload: { users }
    };

    for (const client of room.clients) {
      safeSend(client, event);
    }
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Realtime backend listening on http://localhost:${PORT}`);
});

