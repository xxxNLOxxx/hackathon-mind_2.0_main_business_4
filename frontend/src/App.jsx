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
import { logActivity } from './api/activity';
import { getSessionUsers } from './api/sessions';
import './App.css';

function App() {
  // Состояния для сессии
  const [sessionId, setSessionId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(1);
  
  // Состояния для редактора и синхронизации
  const [code, setCode] = useState('// Начните писать код вместе со студентами...');
  const [language, setLanguage] = useState('javascript');
  const [status, setStatus] = useState('Подключение...');
  
  // Состояния UI
  const [showTerminal, setShowTerminal] = useState(true);
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [showActivityLog, setShowActivityLog] = useState(true);
  
  // Refs для Yjs
  const editorRef = useRef(null);
  const yjsProviderRef = useRef(null);
  const yjsDocRef = useRef(null);
  const bindingRef = useRef(null);

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
      // Применяем предложение AI в редакторе
      if (editorRef.current) {
        const model = editorRef.current.getModel();
        const position = { lineNumber: line, column: 1 };
        const range = model.getLineContent(line);
        
        // Заменяем строку
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
      
      // Логируем применение AI предложения
      if (sessionId && currentUser) {
        await logActivity(
          sessionId,
          currentUser.user_id,
          'ai_suggestion',
          `${currentUser.username} applied AI suggestion at line ${line}`
        );
      }
    },
  });

  // Инициализация Yjs при монтировании редактора
  function handleEditorDidMount(editor) {
    editorRef.current = editor;

    // Создаем Y.Doc
    const doc = new Y.Doc();
    yjsDocRef.current = doc;

    // Определяем комнату (используем sessionId или дефолтную)
    const roomName = sessionId || 'collaborative-room-123';
    
    // Создаем WebSocket провайдер
    const provider = new WebsocketProvider(
      'ws://localhost:3002',
      roomName,
      doc
    );
    yjsProviderRef.current = provider;

    // Получаем текстовый тип
    const type = doc.getText('monaco');

    // Создаем binding
    const binding = new MonacoBinding(
      type,
      editor.getModel(),
      new Set([editor]),
      provider.awareness
    );
    bindingRef.current = binding;

    // Слушаем статус подключения
    provider.on('status', (event) => {
      setStatus(event.status === 'connected' ? 'В сети' : 'Ошибка');
    });

    // Слушаем изменения awareness (пользователи онлайн)
    provider.awareness.on('change', () => {
      const userCount = provider.awareness.getStates().size;
      setOnlineUsers(userCount);
      
      // Обновляем локальный список пользователей
      if (sessionId) {
        loadUsers();
      }
    });

    // Устанавливаем локального пользователя
    if (currentUser) {
      provider.awareness.setLocalState({
        user: {
          id: currentUser.user_id,
          name: currentUser.username,
          color: '#' + Math.floor(Math.random() * 16777215).toString(16),
        },
      });
    }

    // Слушаем изменения в документе
    type.observe(() => {
      const currentCode = type.toString();
      setCode(currentCode);
      onCodeChange(currentCode, 0);
    });
  }

  // Загрузка пользователей из БД
  const loadUsers = async () => {
    if (!sessionId) return;
    try {
      const usersList = await getSessionUsers(sessionId);
      setUsers(usersList);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  // Присоединение к сессии
  const handleJoinSession = async (sessionId, user) => {
    setSessionId(sessionId);
    setCurrentUser(user);
    
    // Логируем присоединение
    await logActivity(
      sessionId,
      user.user_id,
      'join',
      `${user.username} joined the session`
    );
    
    // Если редактор уже инициализирован, обновляем комнату
    if (editorRef.current && yjsProviderRef.current) {
      // Переподключаемся к новой комнате
      yjsProviderRef.current.disconnect();
      
      const newProvider = new WebsocketProvider(
        'http://localhost:3002',
        sessionId,
        yjsDocRef.current
      );
      yjsProviderRef.current = newProvider;
      
      // Обновляем binding
      const newBinding = new MonacoBinding(
        yjsDocRef.current.getText('monaco'),
        editorRef.current.getModel(),
        new Set([editorRef.current]),
        newProvider.awareness
      );
      bindingRef.current = newBinding;
      
      newProvider.on('status', (event) => {
        setStatus(event.status === 'connected' ? 'В сети' : 'Ошибка');
      });
      
      // Устанавливаем пользователя
      newProvider.awareness.setLocalState({
        user: {
          id: user.user_id,
          name: user.username,
          color: '#' + Math.floor(Math.random() * 16777215).toString(16),
        },
      });
    }
  };

  // Запуск кода
  const handleRunCode = async () => {
    if (sessionId && currentUser) {
      await logActivity(
        sessionId,
        currentUser.user_id,
        'run_code',
        `${currentUser.username} ran the code`
      );
    }
  };

  // Изменение языка
  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    if (sessionId && currentUser) {
      logActivity(
        sessionId,
        currentUser.user_id,
        'edit',
        `${currentUser.username} changed language to ${newLanguage}`
      );
    }
  };

  // Если нет сессии - показываем список сессий
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
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
              <option value="json">JSON</option>
            </select>
            <button onClick={handleRunCode} className="run-btn">
              ▶️ Run Code
            </button>
          </div>
          <Editor
            height="100%"
            language={language}
            value={code}
            theme="vs-dark"
            onMount={handleEditorDidMount}
            options={{
              fontSize: 14,
              fontFamily: 'Consolas, "Courier New", monospace',
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: 'on',
              renderWhitespace: 'selection',
              tabSize: 2,
            }}
          />
        </div>
        
        {showActivityLog && (
          <div className="activity-log-area">
            <ActivityLog sessionId={sessionId} />
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