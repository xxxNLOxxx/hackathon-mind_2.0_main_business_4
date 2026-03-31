import React, { useEffect, useRef } from 'react';
import { useTerminal } from '../hooks/useTerminal';
import './Terminal.css';

export const Terminal = ({ roomId, userId, onCommandExecuted }) => {
  const containerId = useRef(`terminal-${Date.now()}`);
  const { isConnected, isInitialized, fit, clear, sendCommand } = useTerminal({
    roomId,
    userId,
    containerId: containerId.current,
    onCommandExecuted,
  });

  useEffect(() => {
    const handleResize = () => {
      setTimeout(fit, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fit]);

  const handleRunCommand = () => {
    const command = prompt('Enter command to run:', 'node index.js');
    if (command) {
      sendCommand(command);
    }
  };

  return (
    <div className="terminal-container">
      <div className="terminal-toolbar">
        <div className="terminal-status">
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`} />
          <span className="status-text">
            {isConnected ? 'Connected to container' : 'Disconnected'}
          </span>
        </div>
        <div className="terminal-actions">
          <button onClick={clear} className="terminal-btn" title="Clear">
            🗑️
          </button>
          <button onClick={fit} className="terminal-btn" title="Fit to window">
            📐
          </button>
          <button onClick={handleRunCommand} className="terminal-btn" title="Run command">
            ▶️
          </button>
        </div>
      </div>
      <div id={containerId.current} className="terminal" />
    </div>
  );
};