// components/SessionList.jsx
import React, { useState, useEffect } from 'react';
import { getSessions, createSession } from '../api/sessions';
import './SessionList.css';

export const SessionList = ({ onJoinSession }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  // Загружаем сессии и проверяем сохраненное имя
  useEffect(() => {
    loadSessions();
    
    // 🔥 Загружаем сохраненное имя, если есть
    const savedUsername = localStorage.getItem('username');
    if (savedUsername) {
      setUsername(savedUsername);
    }
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await getSessions();
      setSessions(data);
    } catch (error) {
      console.error('Error loading sessions:', error);
      setError('Не удалось загрузить сессии');
    } finally {
      setLoading(false);
    }
  };

  // 🔥 Функция создания пользователя (только на фронтенде)
  const createLocalUser = (username) => {
    // Генерируем уникальный ID на основе имени и времени
    const userId = `user_${Date.now()}_${username.replace(/\s/g, '_')}`;
    
    // Создаем пользователя
    const user = {
      user_id: userId,
      username: username,
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      created_at: new Date().toISOString(),
      current_session: null
    };
    
    // Сохраняем в localStorage
    localStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.setItem('username', username);
    localStorage.setItem('userId', userId);
    
    return user;
  };

  // 🔥 Получить текущего пользователя
  const getCurrentUser = () => {
    if (!username.trim()) {
      setError('Пожалуйста, введите имя пользователя');
      return null;
    }
    
    // Проверяем, есть ли сохраненный пользователь с таким же именем
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      // Если имя совпадает с текущим - используем его
      if (user.username === username) {
        return user;
      }
    }
    
    // Если имя не совпадает или нет сохраненного пользователя - создаем нового
    const newUser = createLocalUser(username);
    return newUser;
  };

  // 🔥 Сброс пользователя (очистка localStorage)
  const resetUser = () => {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('username');
    localStorage.removeItem('userId');
    setUsername('');
    setError('Пользователь сброшен. Введите новое имя');
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!newSessionName.trim()) {
      setError('Введите название сессии');
      return;
    }
    if (!username.trim()) {
      setError('Введите имя пользователя');
      return;
    }

    // Получаем или создаем пользователя
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    try {
      // Создаем сессию на сервере
      const session = await createSession(newSessionName);
      
      // Добавляем пользователя к сессии (локально)
      currentUser.current_session = session.session_id;
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      
      // Передаем в главный компонент
      onJoinSession(session.session_id, currentUser);
      
      setShowCreateModal(false);
      setNewSessionName('');
      setError('');
    } catch (error) {
      console.error('Error creating session:', error);
      setError('Не удалось создать сессию');
    }
  };

  const handleJoinSession = async (sessionId) => {
    if (!username.trim()) {
      setError('Введите имя пользователя');
      return;
    }

    // Получаем или создаем пользователя
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    try {
      // Обновляем текущую сессию пользователя
      currentUser.current_session = sessionId;
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      
      onJoinSession(sessionId, currentUser);
      setError('');
    } catch (error) {
      console.error('Error joining session:', error);
      setError('Не удалось присоединиться к сессии');
    }
  };

  const handleUsernameChange = (e) => {
    const newUsername = e.target.value;
    setUsername(newUsername);
    setError('');
    
    // 🔥 Очищаем сохраненного пользователя при изменении имени
    // (чтобы при входе создался новый)
    if (localStorage.getItem('username') !== newUsername) {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('userId');
    }
  };

  if (loading) {
    return (
      <div className="session-list-container">
        <div className="loading">Загрузка сессий...</div>
      </div>
    );
  }

  return (
    <div className="session-list-container">
      <div className="session-list-header">
        <h1>🚀 Code Collaboration Sessions</h1>
        
        <div className="user-info">
          <input
            type="text"
            placeholder="Введите ваше имя"
            value={username}
            onChange={handleUsernameChange}
            className="username-input"
          />
          <button 
            onClick={resetUser}
            className="reset-btn"
            title="Сбросить пользователя"
          >
            🔄 Сбросить
          </button>
          <button onClick={() => setShowCreateModal(true)} className="create-btn">
            + Новая сессия
          </button>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        {/* 🔥 Показываем текущего пользователя */}
        {username && (
          <div className="current-user-info">
            👤 Текущий пользователь: <strong>{username}</strong>
          </div>
        )}
      </div>

      <div className="sessions-grid">
        {sessions.length === 0 ? (
          <div className="no-sessions">
            <p>Нет активных сессий</p>
            <button onClick={() => setShowCreateModal(true)}>
              Создать первую сессию
            </button>
          </div>
        ) : (
          sessions.map((session) => (
            <div key={session.session_id} className="session-card">
              <h3>{session.session_name}</h3>
              <p className="session-id">ID: {session.session_id.slice(0, 8)}...</p>
              <p className="created-at">
                Создана: {new Date(session.created_at).toLocaleString()}
              </p>
              <button 
                onClick={() => handleJoinSession(session.session_id)}
                className="join-btn"
                disabled={!username.trim()}
              >
                Присоединиться
              </button>
            </div>
          ))
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Создать новую сессию</h2>
            <form onSubmit={handleCreateSession}>
              <input
                type="text"
                placeholder="Название сессии"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                autoFocus
              />
              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreateModal(false)}>
                  Отмена
                </button>
                <button type="submit">Создать</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};