// components/ActivityLog.jsx
import React, { useState, useEffect, useRef } from 'react';
import './ActivityLog.css';

export const ActivityLog = ({ sessionId, activities: externalActivities }) => {
  const [activities, setActivities] = useState([]);
  const logEndRef = useRef(null);

  useEffect(() => {
    if (externalActivities) {
      setActivities(externalActivities);
    }
  }, [externalActivities]);

  useEffect(() => {
    scrollToBottom();
  }, [activities]);

  const scrollToBottom = () => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getActionIcon = (actionType) => {
    switch (actionType) {
      case 'join': return '👤';
      case 'leave': return '🚪';
      case 'edit': return '✏️';
      case 'run_code': return '▶️';
      case 'ai_suggestion': return '🤖';
      case 'language_change': return '🌐';
      default: return '📝';
    }
  };

  const getActionColor = (actionType) => {
    switch (actionType) {
      case 'join': return '#4ec9b0';
      case 'leave': return '#f48771';
      case 'run_code': return '#dcdcaa';
      case 'ai_suggestion': return '#9cdcfe';
      default: return '#d4d4d4';
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  if (!activities || activities.length === 0) {
    return (
      <div className="activity-log">
        <h3>📋 Activity Log</h3>
        <div className="log-empty">
          <span>📭 Нет активности</span>
          <p>Здесь будут отображаться действия участников</p>
        </div>
      </div>
    );
  }

  return (
    <div className="activity-log">
      <h3>📋 Activity Log</h3>
      <div className="log-items">
        {activities.map((activity) => (
          <div 
            key={activity.activity_log_id} 
            className="log-item"
            style={{ borderLeftColor: getActionColor(activity.action_type) }}
          >
            <span className="log-icon">{getActionIcon(activity.action_type)}</span>
            <div className="log-content">
              <span className="log-time">{formatTime(activity.created_at)}</span>
              <span className="log-user">
                <strong>{activity.username || activity.user_id?.slice(0, 8)}</strong>
              </span>
              <span className="log-description">{activity.description}</span>
            </div>
          </div>
        ))}
        <div ref={logEndRef} />
      </div>
    </div>
  );
};