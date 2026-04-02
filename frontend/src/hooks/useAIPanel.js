// hooks/useAIPanel.js
import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE_URL = 'http://localhost:3002/api';

export const useAIPanel = ({
  roomId,
  userId,
  userName,
  language = 'javascript',
  onApplySuggestion,
}) => {
  const [analyses, setAnalyses] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const debounceTimeoutRef = useRef(null);
  const lastCodeRef = useRef('');

  const analyzeCode = useCallback(async (code, line) => {
    if (!code || code.trim().length === 0) return;
    
    setIsAnalyzing(true);
    lastCodeRef.current = code;

    try {
      const response = await fetch(`${API_BASE_URL}/ai/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          language,
          roomId,
          userId,
          line,
        }),
      });

      const data = await response.json();
      
      if (data.success && data.analyses) {
        setAnalyses(prev => {
          // Удаляем старые анализы для этих строк
          const filtered = prev.filter(a => 
            !data.analyses.some(newA => newA.line === a.line)
          );
          return [...filtered, ...data.analyses];
        });
      }
    } catch (error) {
      console.error('AI analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [language, roomId, userId]);

  // Дебаунс
  const onCodeChange = useCallback((code, line) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      analyzeCode(code, line);
    }, 1000);
  }, [analyzeCode]);

  const applySuggestion = useCallback((analysisId) => {
    const analysis = analyses.find(a => a.id === analysisId);
    if (analysis && analysis.suggestion && onApplySuggestion) {
      onApplySuggestion(analysis.suggestion, analysis.line);
      setAnalyses(prev => prev.filter(a => a.id !== analysisId));
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
        resolvedCode = analysis.conflictData.mergedCode || '';
        break;
    }

    if (resolvedCode && onApplySuggestion) {
      onApplySuggestion(resolvedCode, analysis.line);
      setAnalyses(prev => prev.filter(a => a.id !== analysisId));
    }
  }, [analyses, onApplySuggestion]);

  const clearAnalyses = useCallback(() => setAnalyses([]), []);
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