const express = require('express');
const cors = require('cors');
const http = require('http');
require('dotenv').config();

const { initDatabase } = require('./database/db');
const { setupWebSocket } = require('./realtime/websocket');
const { aiReview } = require('./ai/ai.service');
const { runCode } = require('./sandbox/sandbox.service');

const sessionsApi = require('./api/sessions');
const usersApi = require('./api/users');
const activityApi = require('./api/activity');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Инициализация БД
initDatabase();

// REST API
app.get('/api/sessions', sessionsApi.getSessions);
app.post('/api/sessions', sessionsApi.createSession);
app.get('/api/sessions/:sessionId', sessionsApi.getSession);
app.get('/api/sessions/:sessionId/users', sessionsApi.getSessionUsers);

app.post('/api/users', usersApi.getOrCreateUser);
app.get('/api/users/:userId', usersApi.getUser);
app.get('/api/users/search', usersApi.searchUser);

app.post('/api/activity', activityApi.logActivity);
app.get('/api/sessions/:sessionId/activity', activityApi.getActivity);

// AI сервис
app.post('/api/ai/review', aiReview);

// Sandbox
app.post('/api/run', runCode);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Создаем HTTP сервер
const server = http.createServer(app);

// WebSocket для реального времени
setupWebSocket(server);

// Запуск
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 API available at http://localhost:${PORT}/api`);
  console.log(`🔌 WebSocket available at ws://localhost:${PORT}`);
  console.log(`🤖 AI service ready`);
  console.log(`📦 Sandbox ready`);
});