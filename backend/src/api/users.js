const { pool } = require('../database/db');
const { v4: uuidv4 } = require('uuid');

// Создать или получить пользователя
const getOrCreateUser = async (req, res) => {
  const { username, avatar_url } = req.body;
  
  try {
    // Ищем существующего пользователя
    let result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    
    if (result.rows.length > 0) {
      return res.json(result.rows[0]);
    }
    
    // Создаем нового
    const userId = uuidv4();
    const avatar = avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
    
    result = await pool.query(
      'INSERT INTO users (user_id, username, avatar_url) VALUES ($1, $2, $3) RETURNING *',
      [userId, username, avatar]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Получить пользователя по ID
const getUser = async (req, res) => {
  const { userId } = req.params;
  
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Поиск пользователя по имени
const searchUser = async (req, res) => {
  const { username } = req.query;
  
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE username ILIKE $1 LIMIT 10',
      [`%${username}%`]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getOrCreateUser,
  getUser,
  searchUser,
};