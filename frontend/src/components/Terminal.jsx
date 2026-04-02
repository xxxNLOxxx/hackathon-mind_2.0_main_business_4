// components/Terminal.jsx
import React, { useState, useRef, useEffect } from 'react';
import './Terminal.css';

const API_BASE_URL = 'http://localhost:3002/api';

export const Terminal = ({ roomId, userId, onCommandExecuted }) => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('Welcome to Collaborative IDE!\r\n$ ');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const outputRef = useRef(null);

  // Автоскролл
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const executeCommand = async (command) => {
    if (!command.trim()) {
      setOutput(prev => prev + '\r\n$ ');
      return;
    }

    // Добавляем в историю
    setHistory(prev => [...prev, command]);
    setHistoryIndex(-1);

    // Получаем текущий код из localStorage
    const code = localStorage.getItem('current_code') || '';
    const language = localStorage.getItem('current_language') || 'javascript';

    setOutput(prev => prev + `\r\n> ${command}\r\n`);

    try {
      const response = await fetch(`${API_BASE_URL}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: command === 'run' ? code : command,
          language,
          stdin: '',
          timeoutMs: 5000,
        }),
      });

      const result = await response.json();
      
      if (result.stdout) {
        setOutput(prev => prev + result.stdout);
      }
      if (result.stderr) {
        setOutput(prev => prev + `\x1b[31m${result.stderr}\x1b[0m`);
      }
      
      onCommandExecuted?.(command);
    } catch (error) {
      setOutput(prev => prev + `\x1b[31mError: ${error.message}\x1b[0m`);
    }
    
    setOutput(prev => prev + '\r\n$ ');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      executeCommand(input);
      setInput('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0 && historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  const clearTerminal = () => {
    setOutput('$ ');
  };

  const runCurrentCode = () => {
    const code = localStorage.getItem('current_code') || '';
    if (code) {
      executeCommand(code);
    } else {
      setOutput(prev => prev + '\r\n\x1b[33mNo code to run. Write some code in the editor first.\x1b[0m\r\n$ ');
    }
  };

  return (
    <div className="terminal-container">
      <div className="terminal-toolbar">
        <div className="terminal-status">
          <span className="status-indicator connected" />
          <span>Terminal Ready</span>
        </div>
        <div className="terminal-actions">
          <button onClick={clearTerminal} className="terminal-btn" title="Clear">
            🗑️
          </button>
          <button onClick={runCurrentCode} className="terminal-btn" title="Run Code">
            ▶️ Run
          </button>
        </div>
      </div>
      
      <div className="terminal-output" ref={outputRef}>
        <pre className="terminal-pre">{output}</pre>
      </div>
      
      <div className="terminal-input-line">
        <span className="terminal-prompt">$</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          onKeyDown={handleKeyDown}
          className="terminal-input"
          autoFocus
          placeholder="Type a command or 'run' to execute code..."
        />
      </div>
    </div>
  );
};