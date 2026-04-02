import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import { useAIPanel } from './hooks/useAIPanel';
import { AIPanel } from './components/AIPanel';
import { Terminal } from './components/Terminal';
import { SessionList } from './components/SessionList';
import { ActivityLog } from './components/ActivityLog';
import './App.css';

function App() {
  const [sessionId, setSessionId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(1);
  const [code, setCode] = useState('// Начните писать код вместе со студентами...');
  const [language, setLanguage] = useState('javascript');
  const [status, setStatus] = useState('Подключение...');
  const [showTerminal, setShowTerminal] = useState(true);
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [showActivityLog, setShowActivityLog] = useState(true);
  const [localActivities, setLocalActivities] = useState([]);
  
  const editorRef = useRef(null);
  const yjsProviderRef = useRef(null);
  const yjsDocRef = useRef(null);
  const bindingRef = useRef(null);

  // Функция для текста действий
  const getActionText = (actionType) => {
    switch (actionType) {
      case 'join': return 'присоединился к сессии';
      case 'leave': return 'покинул сессию';
      case 'edit': return 'редактировал код';
      case 'run_code': return 'запустил код';
      case 'ai_suggestion': return 'применил предложение AI';
      case 'language_change': return 'сменил язык';
      default: return 'совершил действие';
    }
  };

  // Функция для локального логирования
  const logLocalActivity = (actionType, description) => {
    if (!sessionId || !currentUser) return;
    
    const newActivity = {
      activity_log_id: Date.now(),
      session_id: sessionId,
      user_id: currentUser.user_id,
      username: currentUser.username,
      action_type: actionType,
      description: description || `${currentUser.username} ${getActionText(actionType)}`,
      created_at: new Date().toISOString(),
    };
    
    setLocalActivities(prev => [newActivity, ...prev]);
    
    // Сохраняем в localStorage
    const saved = localStorage.getItem(`activities_${sessionId}`);
    const activities = saved ? JSON.parse(saved) : [];
    activities.unshift(newActivity);
    localStorage.setItem(`activities_${sessionId}`, JSON.stringify(activities.slice(0, 100)));
  };

  // Загружаем сохраненные логи при входе в сессию
  useEffect(() => {
    if (sessionId) {
      const saved = localStorage.getItem(`activities_${sessionId}`);
      if (saved) {
        setLocalActivities(JSON.parse(saved));
      } else {
        setLocalActivities([]);
      }
    }
  }, [sessionId]);

  // Логируем вход пользователя
  useEffect(() => {
    if (sessionId && currentUser) {
      logLocalActivity('join', `${currentUser.username} присоединился к сессии`);
    }
  }, [sessionId, currentUser]);

  // AI панель
  const {
    analyses,
    isAnalyzing,
    onCodeChange,
    applySuggestion,
    resolveConflict,
    dismissAnalysis,
    clearAnalyses,
  } = useAIPanel({
    roomId: sessionId,
    userId: currentUser?.user_id,
    userName: currentUser?.username,
    language,
    onApplySuggestion: async (suggestion, line) => {
      if (editorRef.current) {
        const model = editorRef.current.getModel();
        const range = model.getLineContent(line);
        
        model.pushEditOperations(
          [],
          [{
            range: {
              startLineNumber: line,
              startColumn: 1,
              endLineNumber: line,
              endColumn: range.length + 1
            },
            text: suggestion,
            forceMoveMarkers: true
          }],
          () => null
        );
      }
      
      logLocalActivity('ai_suggestion', `${currentUser?.username} применил предложение AI на строке ${line}`);
    },
  });


  const handleEditorChange = (value) => {
  if (value) {
    setCode(value);
    localStorage.setItem('current_code', value); // Сохраняем для терминала
    onCodeChange(value, 0); // Отправляем на AI анализ
  }
};




  // Настройка редактора
  function handleEditorDidMount(editor) {
    editorRef.current = editor;
    
    const doc = new Y.Doc();
    yjsDocRef.current = doc;
    
    const roomName = sessionId || 'collaborative-room-123';
    const provider = new WebsocketProvider(
      'ws://localhost:3002',
      roomName,
      doc
    );
    yjsProviderRef.current = provider;
    
    const type = doc.getText('monaco');
    const binding = new MonacoBinding(
      type,
      editor.getModel(),
      new Set([editor]),
      provider.awareness
    );
    bindingRef.current = binding;
    
    provider.on('status', (event) => {
      setStatus(event.status === 'connected' ? 'В сети' : 'Ошибка');
    });
    
    provider.awareness.on('change', () => {
      const userCount = provider.awareness.getStates().size;
      setOnlineUsers(userCount);
    });
    
    if (currentUser) {
      provider.awareness.setLocalState({
        user: {
          id: currentUser.user_id,
          name: currentUser.username,
          color: '#' + Math.floor(Math.random() * 16777215).toString(16),
        },
      });
    }
    
    type.observe(() => {
      const currentCode = type.toString();
      setCode(currentCode);
      onCodeChange(currentCode, 0);
    });
  }
 
const handleLeaveSession = () => {
  // Логируем выход
  if (sessionId && currentUser) {
    logLocalActivity('leave', `${currentUser.username} покинул сессию`);
  }
  
  // Очищаем состояние
  setSessionId(null);
  setCurrentUser(null);
  setLocalActivities([]);
  
  if (yjsProviderRef.current) {
    yjsProviderRef.current.disconnect();
  }
};

  const handleJoinSession = async (sessionId, user) => {
    setSessionId(sessionId);
    setCurrentUser(user);
    setLocalActivities([]);
  };

  const handleRunCode = () => {
    if (sessionId && currentUser) {
      logLocalActivity('run_code', `${currentUser.username} запустил код`);
    }
  };

  const handleLanguageChange = (newLanguage) => {
     setLanguage(newLanguage);
  localStorage.setItem('current_language', newLanguage);
    if (sessionId && currentUser) {
      logLocalActivity('language_change', `${currentUser.username} сменил язык на ${newLanguage}`);
    }
  };

  if (!sessionId || !currentUser) {
    return <SessionList onJoinSession={handleJoinSession} />;
  }

  return (
    <div className="app">
      <header className="header">
        <div className="session-info">
          <h2>📝 Session: {sessionId.slice(0, 8)}...</h2>
          <div className="status-indicator">
            <span className={`status-dot ${status === 'В сети' ? 'online' : 'offline'}`} />
            <span>{status}</span>
          </div>
          <div className="users-list">
            <span className="users-label">👥 Online: {onlineUsers}</span>
            {users.map((user) => (
              <div key={user.user_id} className="user-avatar" title={user.username}>
                <img src={user.avatar_url} alt={user.username} />
                <span>{user.username}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="view-controls">
          <button 
            onClick={() => setShowActivityLog(!showActivityLog)}
            className={showActivityLog ? 'active' : ''}
          >
            📋 Activity
          </button>
          <button 
            onClick={() => setShowAIPanel(!showAIPanel)}
            className={showAIPanel ? 'active' : ''}
          >
            🤖 AI
          </button>
          <button 
            onClick={() => setShowTerminal(!showTerminal)}
            className={showTerminal ? 'active' : ''}
          >
            💻 Terminal
          </button>
          <button 
    onClick={handleLeaveSession}
    className="leave-btn"
  >
    🚪 Exit
  </button>
        </div>
      </header>

      <div className="main-layout">
        <div className="editor-area">
          <div className="editor-toolbar">
            <select 
              value={language} 
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="language-select"
            >
              <option value="javascript">📜 JavaScript</option>
              <option value="typescript">📘 TypeScript</option>
              <option value="python">🐍 Python</option>
              <option value="html">🌐 HTML</option>
              <option value="css">🎨 CSS</option>
              <option value="sql">🗄️ SQL</option>
              <option value="java">☕ Java</option>
              <option value="cpp">⚙️ C++</option>
              <option value="go">🐹 Go</option>
              <option value="rust">🦀 Rust</option>
              <option value="json">🔧 JSON</option>
            </select>
            <button onClick={handleRunCode} className="run-btn">
              ▶️ Run Code
            </button>
          </div>
          <Editor
  height="100%"
  language={language}
  value={code}
  onChange={handleEditorChange} 
  theme="vs-dark"
  onMount={handleEditorDidMount}
  options={{
    fontSize: 14,
    fontFamily: 'Consolas, "Courier New", monospace',
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    automaticLayout: true,
  }}
/>
        </div>
        
        {showActivityLog && (
          <div className="activity-log-area">
            <ActivityLog 
              sessionId={sessionId} 
              activities={localActivities}
            />
          </div>
        )}
        
        {showAIPanel && (
          <div className="ai-panel-area">
            <AIPanel
              analyses={analyses}
              isAnalyzing={isAnalyzing}
              onApplySuggestion={applySuggestion}
              onResolveConflict={resolveConflict}
              onDismiss={dismissAnalysis}
              onClearAll={clearAnalyses}
              language={language}
            />
          </div>
        )}
      </div>
      
      {showTerminal && (
        <div className="terminal-area">
          <Terminal
            roomId={sessionId}
            userId={currentUser.user_id}
            onCommandExecuted={handleRunCode}
          />
        </div>
      )}
    </div>
  );
}

export default App;