const API_BASE_URL = 'http://localhost:3002/api';

// Логировать действие
export const logActivity = async (sessionId, userId, actionType, description) => {
  try {
    const response = await fetch(`${API_BASE_URL}/activity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId,
        user_id: userId,
        action_type: actionType,
        description,
      }),
    });
    return await response.json();
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};