const API_BASE_URL = 'http://localhost:3002/api';

// Получить все активные сессии
export const getSessions = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/sessions`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching sessions:', error);
    throw error;
  }
};


export const createSession = async (sessionName) => {
  try {
    const response = await fetch(`${API_BASE_URL}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ session_name: sessionName }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
};

export const getSession = async (sessionId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching session:', error);
    throw error;
  }
};

export const getSessionUsers = async (sessionId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/users`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching session users:', error);
    throw error;
  }
};

export const getSessionActivity = async (sessionId, limit = 50) => {
  try {
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/activity?limit=${limit}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching session activity:', error);
    throw error;
  }
};