import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';

function App() {
  const [status, setStatus] = useState('Подключение...');
  const [users, setUsers] = useState(1);
  const editorRef = useRef(null);


  function handleEditorDidMount(editor) {
    editorRef.current = editor;


    const doc = new Y.Doc();


    const provider = new WebsocketProvider(
      'wss://demos.yjs.dev',     
      'collaborative-room-123',  
      doc
    );

    const type = doc.getText('monaco');

    const binding = new MonacoBinding(
      type,
      editorRef.current.getModel(),
      new Set([editorRef.current]),
      provider.awareness
    );

    provider.on('status', (event) => {
      setStatus(event.status === 'connected' ? 'В сети' : 'Ошибка');
    });

    provider.awareness.on('change', () => {
      setUsers(provider.awareness.getStates().size);
    });
  }

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#1e1e1e',
        color: 'white',
      }}
    >
      <header
        style={{
          padding: '10px 20px',
          borderBottom: '1px solid #333',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <strong>Real-time IDE</strong>
          <span
            style={{
              marginLeft: '15px',
              fontSize: '12px',
              color: status === 'В сети' ? '#4caf50' : '#f44336',
            }}
          >
            ● {status}
          </span>
        </div>
        <div>Студентов в комнате: {users}</div>
      </header>

      <div style={{ display: 'flex', flex: 1 }}>
        <aside
          style={{
            width: '250px',
            borderRight: '1px solid #333',
            padding: '15px',
            fontSize: '14px',
          }}
        >
          <h3 style={{ color: '#007acc' }}>AI Assistant</h3>
          <p style={{ color: '#888' }}>Анализирую код...</p>
          <div
            style={{
              marginTop: '20px',
              padding: '10px',
              backgroundColor: '#2d2d2d',
              borderRadius: '4px',
            }}
          >
            <small>Совет: Используйте const вместо var для стабильности.</small>
          </div>
        </aside>

        <main style={{ flex: 1 }}>
          <Editor
            height="100%"
            theme="vs-dark"
            defaultLanguage="javascript"
            defaultValue="// Начните писать код вместе со студентами..."
            onMount={handleEditorDidMount}
            options={{
              fontSize: 16,
              minimap: { enabled: false },
              automaticLayout: true,
            }}
          />
        </main>
      </div>

      <footer
        style={{
          height: '150px',
          borderTop: '1px solid #333',
          padding: '10px',
          backgroundColor: '#000',
          fontFamily: 'monospace',
        }}
      >
        <div style={{ color: '#00ff00' }}>$ node app.js</div>
        <div style={{ color: '#fff' }}>Server is running on port 3000...</div>
      </footer>
    </div>
  );
}

export default App;