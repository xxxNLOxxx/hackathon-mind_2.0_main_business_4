const { WebSocketServer } = require('ws');
const { addUserToSession, removeUserFromSession } = require('../api/sessions');

// Хранилище комнат
const rooms = new Map();

const getRoom = (roomId) => {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      clients: new Set(),
      users: new Map(),
    });
  }
  return rooms.get(roomId);
};

const setupWebSocket = (server) => {
  const wss = new WebSocketServer({ server });
  
  wss.on('connection', (ws, req) => {
    ws.currentRoomId = null;
    ws.currentUserId = null;
    
    ws.on('message', async (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch (e) {
        ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid JSON' } }));
        return;
      }
      
      const { type, roomId, userId, payload } = msg;
      
      if (!type || !roomId || !userId) {
        ws.send(JSON.stringify({ type: 'error', payload: { message: 'Missing fields' } }));
        return;
      }
      
      const room = getRoom(roomId);
      
      switch (type) {
        case 'join_room':
          ws.currentRoomId = roomId;
          ws.currentUserId = userId;
          
          room.clients.add(ws);
          room.users.set(ws, {
            userId,
            name: payload?.name || `User-${userId}`,
            avatar: payload?.avatar,
            role: payload?.role || 'editor',
          });
          
          // Добавляем в БД
          try {
            await addUserToSession(
              { params: { sessionId: roomId }, body: { user_id: userId } },
              { json: () => {}, status: () => ({ json: () => {} }) }
            );
          } catch (e) {}
          
          // Оповещаем всех
          const usersList = Array.from(room.users.values());
          broadcast(room, {
            type: 'user_joined',
            roomId,
            userId,
            payload: { users: usersList },
          });
          break;
          
        case 'code_update':
          broadcast(room, {
            type: 'code_update',
            roomId,
            userId,
            payload,
          }, ws);
          break;
          
        case 'cursor_update':
          broadcast(room, {
            type: 'cursor_update',
            roomId,
            userId,
            payload,
          }, ws);
          break;
          
        case 'leave_room':
          handleLeave(ws, room, roomId, userId);
          break;
      }
    });
    
    ws.on('close', async () => {
      if (ws.currentRoomId && ws.currentUserId) {
        const room = rooms.get(ws.currentRoomId);
        if (room) {
          await handleLeave(ws, room, ws.currentRoomId, ws.currentUserId);
        }
      }
    });
  });
  
  const broadcast = (room, message, exclude = null) => {
    for (const client of room.clients) {
      if (client !== exclude && client.readyState === client.OPEN) {
        client.send(JSON.stringify(message));
      }
    }
  };
  
  const handleLeave = async (ws, room, roomId, userId) => {
    room.clients.delete(ws);
    room.users.delete(ws);
    
    try {
      await removeUserFromSession(
        { params: { sessionId: roomId }, body: { user_id: userId } },
        { json: () => {}, status: () => ({ json: () => {} }) }
      );
    } catch (e) {}
    
    const usersList = Array.from(room.users.values());
    broadcast(room, {
      type: 'user_left',
      roomId,
      userId,
      payload: { users: usersList },
    });
  };
  
  return wss;
};

module.exports = { setupWebSocket };