// api/users.js
const API_BASE_URL = 'http://localhost:3002/api';

// 🔥 Создать или получить пользователя
export const getOrCreateUser = async (username, avatarUrl = null) => {
  try {
    // Проверяем, есть ли пользователь с таким именем на сервере
    const searchResponse = await fetch(`${API_BASE_URL}/users/search?username=${encodeURIComponent(username)}`);
    
    if (searchResponse.ok) {
      const existingUser = await searchResponse.json();
      if (existingUser) {
        // Если пользователь существует, возвращаем его
        localStorage.setItem('userId', existingUser.user_id);
        return existingUser;
      }
    }
    
    // Если пользователя нет - создаем нового
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
    
    const newUser = await response.json();
    localStorage.setItem('userId', newUser.user_id);
    return newUser;
  } catch (error) {
    console.error('Error in getOrCreateUser:', error);
    throw error;
  }
};

// 🔥 Новая функция: принудительное создание пользователя с новым именем
export const createNewUser = async (username, avatarUrl = null) => {
  try {
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
    
    const newUser = await response.json();
    localStorage.setItem('username', username);
    localStorage.setItem('userId', newUser.user_id);
    return newUser;
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