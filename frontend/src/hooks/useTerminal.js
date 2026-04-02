// hooks/useTerminal.js
import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

const API_BASE_URL = 'http://localhost:3002/api';

export const useTerminal = ({ roomId, containerId, userId, onCommandExecuted }) => {
  const [isConnected, setIsConnected] = useState(true); // Всегда true для REST API
  const [isInitialized, setIsInitialized] = useState(false);
  const terminalRef = useRef(null);
  const fitAddonRef = useRef(null);
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);

  // Инициализация терминала
  useEffect(() => {
    if (isInitialized || !containerId) return;

    const container = document.getElementById(containerId);
    if (!container) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'Consolas, monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(container);
    fitAddon.fit();

    terminalRef.current = term;
    fitAddonRef.current = fitAddon;
    setIsInitialized(true);

    term.write('Welcome to Collaborative IDE!\r\n');
    term.write('Type your code and press Enter to run\r\n');
    term.write('$ ');

    window.addEventListener('resize', () => fitAddon.fit());
    
    return () => {
      term.dispose();
      window.removeEventListener('resize', () => fitAddon.fit());
    };
  }, [containerId, isInitialized]);

  // 🔥 Запуск кода через бэкенд
  const runCode = async (command) => {
    if (!terminalRef.current) return;

    terminalRef.current.write(`\r\n> ${command}\r\n`);
    
    try {
      // Получаем текущий код из редактора (нужно передать извне)
      const code = localStorage.getItem('current_code') || command;
      const language = localStorage.getItem('current_language') || 'javascript';
      
      const response = await fetch(`${API_BASE_URL}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          language,
          stdin: '',
          timeoutMs: 5000,
        }),
      });

      const result = await response.json();
      
      if (result.stdout) {
        terminalRef.current.write(result.stdout);
      }
      if (result.stderr) {
        terminalRef.current.write(`\x1b[1;31m${result.stderr}\x1b[0m`);
      }
      
      onCommandExecuted?.(command);
    } catch (error) {
      terminalRef.current.write(`\x1b[1;31mError: ${error.message}\x1b[0m\r\n`);
    }
    
    terminalRef.current.write('\r\n$ ');
  };

  // Обработка ввода
  useEffect(() => {
    if (!isInitialized || !terminalRef.current) return;

    let currentLine = '';

    const onData = (data) => {
      if (data === '\r') { // Enter
        if (currentLine.trim()) {
          historyRef.current.push(currentLine);
          historyIndexRef.current = historyRef.current.length;
          runCode(currentLine);
        } else {
          terminalRef.current.write('\r\n$ ');
        }
        currentLine = '';
      } 
      else if (data === '\x7f') { // Backspace
        if (currentLine.length > 0) {
          currentLine = currentLine.slice(0, -1);
          terminalRef.current.write('\b \b');
        }
      }
      else if (data === '\x1b[A') { // Up arrow
        if (historyIndexRef.current > 0) {
          historyIndexRef.current--;
          const prevCommand = historyRef.current[historyIndexRef.current];
          if (prevCommand) {
            // Clear current line
            for (let i = 0; i < currentLine.length; i++) {
              terminalRef.current.write('\b \b');
            }
            currentLine = prevCommand;
            terminalRef.current.write(currentLine);
          }
        }
      }
      else if (data === '\x1b[B') { // Down arrow
        if (historyIndexRef.current < historyRef.current.length - 1) {
          historyIndexRef.current++;
          const nextCommand = historyRef.current[historyIndexRef.current];
          // Clear current line
          for (let i = 0; i < currentLine.length; i++) {
            terminalRef.current.write('\b \b');
          }
          currentLine = nextCommand;
          terminalRef.current.write(currentLine);
        }
      }
      else if (data.charCodeAt(0) >= 32) { // Printable characters
        currentLine += data;
        terminalRef.current.write(data);
      }
    };

    terminalRef.current.onData(onData);
    
    return () => {
      terminalRef.current?.offData(onData);
    };
  }, [isInitialized]);

  const fit = () => fitAddonRef.current?.fit();
  const clear = () => terminalRef.current?.clear();
  const write = (data) => terminalRef.current?.write(data);
  const sendCommand = (command) => runCode(command);

  return { isConnected, isInitialized, fit, clear, write, sendCommand };
};