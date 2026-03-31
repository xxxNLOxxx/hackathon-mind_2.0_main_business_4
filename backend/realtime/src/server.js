const http = require('http');
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const { v4: uuidv4 } = require('uuid'); // Добавьте эту зависимость

const PORT = process.env.PORT || 3002;

const app = express();
app.use(cors());
app.use(express.json());

// ============ ДОБАВЛЯЕМ ХРАНИЛИЩЕ ДЛЯ СЕССИЙ И ПОЛЬЗОВАТЕЛЕЙ ============
// In-memory storage for sessions and users
const sessions = new Map();
const users = new Map();
const activities = [];

// Создаем тестовую сессию при старте
sessions.set('test-session-1', {
  session_id: 'test-session-1',
  session_name: 'Test Session',
  created_at: new Date().toISOString(),
  is_active: true
});

// In-memory room storage для WebSocket
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
  const usersList = [];
  for (const [, userInfo] of room.users.entries()) {
    usersList.push({
      userId: userInfo.userId,
      name: userInfo.name,
      avatar: userInfo.avatar,
      role: userInfo.role
    });
  }
  return usersList;
}

function safeSend(ws, data) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

// ============ ДОБАВЛЯЕМ REST API ЭНДПОИНТЫ ============

// Получить все активные сессии
app.get('/api/sessions', (req, res) => {
  const activeSessions = Array.from(sessions.values()).filter(s => s.is_active);
  res.json(activeSessions);
});

// Создать сессию
app.post('/api/sessions', (req, res) => {
  const { session_name } = req.body;
  const sessionId = uuidv4();
  
  const newSession = {
    session_id: sessionId,
    session_name: session_name || 'New Session',
    created_at: new Date().toISOString(),
    is_active: true
  };
  
  sessions.set(sessionId, newSession);
  res.json(newSession);
});

// Получить сессию по ID
app.get('/api/sessions/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  res.json(session);
});

// Получить участников сессии (из WebSocket комнаты)
app.get('/api/sessions/:sessionId/users', (req, res) => {
  const { sessionId } = req.params;
  const room = rooms.get(sessionId);
  
  if (!room) {
    return res.json([]);
  }
  
  const usersList = buildUsersList(room);
  res.json(usersList);
});

// Создать или получить пользователя
app.post('/api/users', (req, res) => {
  const { username, avatar_url } = req.body;
  
  // Проверяем, есть ли уже такой пользователь
  let user = Array.from(users.values()).find(u => u.username === username);
  
  if (!user) {
    const userId = uuidv4();
    user = {
      user_id: userId,
      username: username,
      avatar_url: avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      created_at: new Date().toISOString(),
      current_session: null
    };
    users.set(userId, user);
  }
  
  res.json(user);
});

// Получить пользователя по ID
app.get('/api/users/:userId', (req, res) => {
  const { userId } = req.params;
  const user = users.get(userId);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json(user);
});

// Логировать активность
app.post('/api/activity', (req, res) => {
  const { session_id, user_id, action_type, description } = req.body;
  
  const activity = {
    activity_log_id: activities.length + 1,
    session_id,
    user_id,
    action_type,
    description,
    created_at: new Date().toISOString()
  };
  
  activities.unshift(activity);
  
  // Обновляем текущую сессию пользователя
  const user = users.get(user_id);
  if (user) {
    user.current_session = session_id;
  }
  
  res.json(activity);
});

// Получить активность сессии
app.get('/api/sessions/:sessionId/activity', (req, res) => {
  const { sessionId } = req.params;
  const limit = parseInt(req.query.limit) || 50;
  
  const sessionActivities = activities
    .filter(a => a.session_id === sessionId)
    .slice(0, limit);
  
  res.json(sessionActivities);
});

// ============ СУЩЕСТВУЮЩИЕ ЭНДПОИНТЫ ============

// REST: POST /run (mock implementation)
app.post('/run', (req, res) => {
  const { roomId, code, language, stdin, timeoutMs } = req.body || {};

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

        const usersList = buildUsersList(room);

        // Broadcast user_joined to everyone in room
        const event = {
          type: 'user_joined',
          roomId,
          userId,
          payload: {
            ...userInfo,
            users: usersList
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

        const usersList = buildUsersList(room);

        const event = {
          type: 'user_left',
          roomId,
          userId,
          payload: { users: usersList }
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

    const usersList = buildUsersList(room);

    const event = {
      type: 'user_left',
      roomId,
      userId,
      payload: { users: usersList }
    };

    for (const client of room.clients) {
      safeSend(client, event);
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Realtime backend listening on http://localhost:${PORT}`);
  console.log(`📝 REST API available at http://localhost:${PORT}/api`);
  console.log(`🔌 WebSocket available at ws://localhost:${PORT}`);
});