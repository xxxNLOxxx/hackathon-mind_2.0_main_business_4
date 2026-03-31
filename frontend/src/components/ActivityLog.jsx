import React, { useState, useEffect, useRef } from 'react';
import { getSessionActivity } from '../api/sessions';
import './ActivityLog.css';

export const ActivityLog = ({ sessionId }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const logEndRef = useRef(null);

  useEffect(() => {
    loadActivities();
    
    // Обновляем каждые 5 секунд
    const interval = setInterval(loadActivities, 5000);
    
    return () => clearInterval(interval);
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [activities]);

  const loadActivities = async () => {
    try {
      const data = await getSessionActivity(sessionId, 50);
      setActivities(data);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getActionIcon = (actionType) => {
    switch (actionType) {
      case 'join':
        return '👤';
      case 'leave':
        return '🚪';
      case 'edit':
        return '✏️';
      case 'run_code':
        return '▶️';
      case 'ai_suggestion':
        return '🤖';
      case 'conflict_resolved':
        return '✅';
      default:
        return '📝';
    }
  };

  if (loading) {
    return <div className="activity-log loading">Loading activity...</div>;
  }

  return (
    <div className="activity-log">
      <h3>📋 Activity Log</h3>
      <div className="log-items">
        {activities.length === 0 ? (
          <div className="log-empty">No activity yet</div>
        ) : (
          activities.map((activity) => (
            <div key={activity.activity_log_id} className="log-item">
              <span className="log-icon">{getActionIcon(activity.action_type)}</span>
              <div className="log-content">
                <span className="log-time">
                  {new Date(activity.created_at).toLocaleTimeString()}
                </span>
                <span className="log-description">{activity.description}</span>
              </div>
            </div>
          ))
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  );
};