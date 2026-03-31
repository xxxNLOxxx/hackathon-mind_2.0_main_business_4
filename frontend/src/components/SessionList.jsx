import React, { useState, useEffect } from 'react';
import { getSessions, createSession } from '../api/sessions';
import { getOrCreateUser } from '../api/users';
import './SessionList.css';

export const SessionList = ({ onJoinSession }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [username, setUsername] = useState('');
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSessions();
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const storedUsername = localStorage.getItem('username');
      if (storedUsername) {
        const userData = await getOrCreateUser(storedUsername);
        setUser(userData);
        setUsername(storedUsername);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await getSessions();
      setSessions(data);
    } catch (error) {
      console.error('Error loading sessions:', error);
      setError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!newSessionName.trim()) return;
    if (!username.trim()) {
      setError('Please enter your username');
      return;
    }

    try {
      // Сохраняем имя пользователя
      localStorage.setItem('username', username);
      
      // Создаем или получаем пользователя
      const userData = await getOrCreateUser(username);
      setUser(userData);
      
      // Создаем сессию
      const session = await createSession(newSessionName);
      
      // Присоединяемся к сессии
      onJoinSession(session.session_id, userData);
      
      setShowCreateModal(false);
      setNewSessionName('');
    } catch (error) {
      console.error('Error creating session:', error);
      setError('Failed to create session');
    }
  };

  const handleJoinSession = async (sessionId) => {
    if (!username.trim()) {
      setError('Please enter your username first');
      return;
    }

    try {
      const userData = await getOrCreateUser(username);
      onJoinSession(sessionId, userData);
    } catch (error) {
      console.error('Error joining session:', error);
      setError('Failed to join session');
    }
  };

  if (loading) {
    return (
      <div className="session-list-container">
        <div className="loading">Loading sessions...</div>
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
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="username-input"
          />
          <button onClick={() => setShowCreateModal(true)} className="create-btn">
            + New Session
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="sessions-grid">
        {sessions.length === 0 ? (
          <div className="no-sessions">
            <p>No active sessions</p>
            <button onClick={() => setShowCreateModal(true)}>Create your first session</button>
          </div>
        ) : (
          sessions.map((session) => (
            <div key={session.session_id} className="session-card">
              <h3>{session.session_name}</h3>
              <p className="session-id">ID: {session.session_id.slice(0, 8)}...</p>
              <p className="created-at">
                Created: {new Date(session.created_at).toLocaleString()}
              </p>
              <button 
                onClick={() => handleJoinSession(session.session_id)}
                className="join-btn"
                disabled={!username.trim()}
              >
                Join Session
              </button>
            </div>
          ))
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Session</h2>
            <form onSubmit={handleCreateSession}>
              <input
                type="text"
                placeholder="Session Name"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                autoFocus
              />
              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};