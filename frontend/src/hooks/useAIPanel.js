import { useState, useEffect, useCallback, useRef } from 'react';

const LANGUAGE_PROMPTS = {
  javascript: {
    name: 'JavaScript',
    prompt: 'Analyze this JavaScript code for bugs, anti-patterns, and security issues:',
  },
  python: {
    name: 'Python',
    prompt: 'Analyze this Python code for bugs, anti-patterns, and security issues:',
  },
  html: {
    name: 'HTML',
    prompt: 'Analyze this HTML code for accessibility issues, semantic errors, and best practices:',
  },
  css: {
    name: 'CSS',
    prompt: 'Analyze this CSS code for browser compatibility, performance, and best practices:',
  },
  typescript: {
    name: 'TypeScript',
    prompt: 'Analyze this TypeScript code for type errors, anti-patterns, and best practices:',
  },
  java: {
    name: 'Java',
    prompt: 'Analyze this Java code for bugs, anti-patterns, and security issues:',
  },
  cpp: {
    name: 'C++',
    prompt: 'Analyze this C++ code for memory leaks, bugs, and best practices:',
  },
  go: {
    name: 'Go',
    prompt: 'Analyze this Go code for concurrency issues, bugs, and best practices:',
  },
  rust: {
    name: 'Rust',
    prompt: 'Analyze this Rust code for memory safety, ownership issues, and best practices:',
  },
  sql: {
    name: 'SQL',
    prompt: 'Analyze this SQL query for performance issues, injection vulnerabilities, and best practices:',
  },
};


export const useAIPanel = ({
  roomId,
  userId,
  userName,
  language,
  onApplySuggestion,
}) => {
  const [analyses, setAnalyses] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [ws, setWs] = useState(null);
  const debounceTimeoutRef = useRef(null);
  const lastCodeRef = useRef('');

  useEffect(() => {
    const aiWs = new WebSocket(`http://localhost:3001/ai?roomId=${roomId}&userId=${userId}`);
    
    aiWs.onopen = () => {
      console.log('AI WebSocket connected');
    };

    aiWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.success && data.analyses) {
          setAnalyses(prev => {
            // Удаляем старые анализы для тех же строк и типов
            const filtered = prev.filter(a => 
              !data.analyses.some(newA => 
                newA.type === a.type && newA.line === a.line
              )
            );
            return [...filtered, ...data.analyses];
          });
        }
      } catch (error) {
        console.error('Error parsing AI message:', error);
      }
    };

    aiWs.onerror = (error) => {
      console.error('AI WebSocket error:', error);
    };

    setWs(aiWs);

    return () => {
      aiWs.close();
    };
  }, [roomId, userId]);

  // Отправка кода на анализ (с дебаунсом)
  const analyzeCode = useCallback((code, line) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    setIsAnalyzing(true);
    lastCodeRef.current = code;
    const langInfo = LANGUAGE_PROMPTS[language] || LANGUAGE_PROMPTS.javascript;

    const request = {
      code,
      language,
      userId,
      roomId,
      line,
    };

    ws.send(JSON.stringify(request));
    setIsAnalyzing(false);
  }, [ws, language, userId, roomId]);

  const onCodeChange = useCallback((code, line) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      analyzeCode(code, line);
    }, 800);
  }, [analyzeCode]);

  const applySuggestion = useCallback((analysisId) => {
    const analysis = analyses.find(a => a.id === analysisId);
    if (analysis && analysis.suggestion && onApplySuggestion) {
      onApplySuggestion(analysis.suggestion, analysis.line);
      
      setAnalyses(prev => 
        prev.map(a => 
          a.id === analysisId 
            ? { ...a, type: 'error', message: `✓ Applied: ${a.message}` }
            : a
        )
      );
    }
  }, [analyses, onApplySuggestion]);

  const resolveConflict = useCallback((analysisId, resolution) => {
    const analysis = analyses.find(a => a.id === analysisId);
    if (!analysis || !analysis.conflictData) return;

    let resolvedCode = '';
    
    switch (resolution) {
      case 'accept_first':
        resolvedCode = analysis.conflictData.users[0]?.code || '';
        break;
      case 'accept_second':
        resolvedCode = analysis.conflictData.users[1]?.code || '';
        break;
      case 'ai_merge':
        resolvedCode = analysis.conflictData.mergedCode || analysis.conflictData.users[0]?.code || '';
        break;
    }

    if (resolvedCode && onApplySuggestion) {
      onApplySuggestion(resolvedCode, analysis.line);
      setAnalyses(prev => prev.filter(a => a.id !== analysisId));
    }
  }, [analyses, onApplySuggestion]);

  const clearAnalyses = useCallback(() => {
    setAnalyses([]);
  }, []);

  const dismissAnalysis = useCallback((analysisId) => {
    setAnalyses(prev => prev.filter(a => a.id !== analysisId));
  }, []);

  return {
    analyses,
    isAnalyzing,
    onCodeChange,
    applySuggestion,
    resolveConflict,
    clearAnalyses,
    dismissAnalysis,
  };
};