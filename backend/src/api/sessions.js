const { pool } = require('../database/db');
const { v4: uuidv4 } = require('uuid');

// Получить все активные сессии
const getSessions = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM sessions WHERE is_active = true ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Создать сессию
const createSession = async (req, res) => {
  const { session_name } = req.body;
  const sessionId = uuidv4();
  
  try {
    const result = await pool.query(
      'INSERT INTO sessions (session_id, session_name) VALUES ($1, $2) RETURNING *',
      [sessionId, session_name || 'Новая сессия']
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Получить сессию по ID
const getSession = async (req, res) => {
  const { sessionId } = req.params;
  
  try {
    const result = await pool.query(
      'SELECT * FROM sessions WHERE session_id = $1',
      [sessionId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Получить участников сессии
const getSessionUsers = async (req, res) => {
  const { sessionId } = req.params;
  
  try {
    const result = await pool.query(
      `SELECT u.user_id, u.username, u.avatar_url, su.joined_at 
       FROM users u 
       JOIN session_users su ON u.user_id = su.user_id 
       WHERE su.session_id = $1`,
      [sessionId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Добавить пользователя в сессию
const addUserToSession = async (req, res) => {
  const { sessionId } = req.params;
  const { user_id } = req.body;
  
  try {
    await pool.query(
      'INSERT INTO session_users (session_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [sessionId, user_id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Удалить пользователя из сессии
const removeUserFromSession = async (req, res) => {
  const { sessionId } = req.params;
  const { user_id } = req.body;
  
  try {
    await pool.query(
      'DELETE FROM session_users WHERE session_id = $1 AND user_id = $2',
      [sessionId, user_id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getSessions,
  createSession,
  getSession,
  getSessionUsers,
  addUserToSession,
  removeUserFromSession,
};