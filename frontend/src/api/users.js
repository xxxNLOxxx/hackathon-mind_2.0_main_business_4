const API_BASE_URL = 'http://localhost:3002/api';

// Создать или получить пользователя
export const getOrCreateUser = async (username, avatarUrl = null) => {
  try {
    // Проверяем, есть ли пользователь в localStorage
    let userId = localStorage.getItem('userId');
    
    if (userId) {
      // Проверяем, существует ли пользователь
      const response = await fetch(`${API_BASE_URL}/users/${userId}`);
      if (response.ok) {
        const user = await response.json();
        return user;
      }
    }
    
    // Создаем нового пользователя
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        username, 
        avatar_url: avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}` 
      }),
    });
    
    const user = await response.json();
    localStorage.setItem('userId', user.user_id);
    return user;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

// Получить пользователя по ID
export const getUser = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
};