const { pool } = require('../database/db');

// Логировать активность
const logActivity = async (req, res) => {
  const { session_id, user_id, action_type, description } = req.body;
  
  try {
    const result = await pool.query(
      `INSERT INTO activity_logs (session_id, user_id, action_type, description) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [session_id, user_id, action_type, description]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Получить активность сессии
const getActivity = async (req, res) => {
  const { sessionId } = req.params;
  const limit = req.query.limit || 50;
  
  try {
    const result = await pool.query(
      `SELECT a.*, u.username 
       FROM activity_logs a
       JOIN users u ON a.user_id = u.user_id
       WHERE a.session_id = $1 
       ORDER BY a.created_at DESC 
       LIMIT $2`,
      [sessionId, limit]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  logActivity,
  getActivity,
};