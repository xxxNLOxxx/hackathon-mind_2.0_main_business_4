import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';

export const useTerminal = ({ roomId, containerId, userId, onCommandExecuted }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const terminalRef = useRef(null);
  const wsRef = useRef(null);
  const fitAddonRef = useRef(null);

  useEffect(() => {
    if (isInitialized || !containerId) return;

    const container = document.getElementById(containerId);
    if (!container) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#aeafad',
        cursorAccent: '#1e1e1e',
        selection: '#264f78',
        black: '#1e1e1e',
        red: '#f48771',
        green: '#4ec9b0',
        yellow: '#dcdcaa',
        blue: '#9cdcfe',
        magenta: '#c586c0',
        cyan: '#4ec9b0',
        white: '#d4d4d4',
        brightBlack: '#808080',
        brightRed: '#f48771',
        brightGreen: '#4ec9b0',
        brightYellow: '#dcdcaa',
        brightBlue: '#9cdcfe',
        brightMagenta: '#c586c0',
        brightCyan: '#4ec9b0',
        brightWhite: '#ffffff',
      },
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    term.open(container);
    fitAddon.fit();

    terminalRef.current = term;
    fitAddonRef.current = fitAddon;
    setIsInitialized(true);

    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
        const { cols, rows } = term;
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'resize',
            cols,
            rows,
          }));
        }
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, [containerId, isInitialized]);

  useEffect(() => {
    if (!isInitialized || !terminalRef.current) return;

    const ws = new WebSocket(`http://localhost:3002/terminal?roomId=${roomId}&userId=${userId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Terminal WebSocket connected');
      setIsConnected(true);
      
      const term = terminalRef.current;
      const { cols, rows } = term;
      
      ws.send(JSON.stringify({
        type: 'init',
        cols,
        rows,
      }));

      term.clear();
      term.write('\x1b[1;32mConnected to container\x1b[0m\r\n');
      term.write('$ ');
    };

    ws.onmessage = (event) => {
      const term = terminalRef.current;
      if (!term) return;

      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'output') {
          term.write(data.data);
        } else if (data.type === 'error') {
          term.write(`\x1b[1;31mError: ${data.message}\x1b[0m\r\n`);
        } else if (typeof data === 'string') {
          term.write(data);
        } else if (event.data instanceof ArrayBuffer) {
          term.write(new Uint8Array(event.data));
        }
      } catch (error) {
        term.write(event.data);
      }
    };

    ws.onerror = (error) => {
      console.error('Terminal WebSocket error:', error);
      const term = terminalRef.current;
      if (term) {
        term.write('\x1b[1;31mWebSocket connection error\x1b[0m\r\n');
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      const term = terminalRef.current;
      if (term) {
        term.write('\x1b[1;33mDisconnected from container. Reconnecting...\x1b[0m\r\n');
      }
      
    };

    const onData = (data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'input',
          data,
        }));
        
      }
    };

    terminalRef.current.onData(onData);

    return () => {
      ws.close();
    };
  }, [isInitialized, roomId, userId, onCommandExecuted]);

  const fit = () => {
    if (fitAddonRef.current) {
      fitAddonRef.current.fit();
    }
  };

  const clear = () => {
    const term = terminalRef.current;
    if (term) {
      term.clear();
    }
  };

  const write = (data) => {
    const term = terminalRef.current;
    if (term) {
      term.write(data);
    }
  };

  const sendCommand = (command) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'input',
        data: command + '\r',
      }));
    }
  };

  return {
    isConnected,
    isInitialized,
    fit,
    clear,
    write,
    sendCommand,
  };
};