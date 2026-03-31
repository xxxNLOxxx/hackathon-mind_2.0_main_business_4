import React, { useState } from 'react';
import './AIPanel.css';

export const AIPanel = ({
  analyses,
  isAnalyzing,
  onApplySuggestion,
  onResolveConflict,
  onDismiss,
  onClearAll,
}) => {
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  const filteredAnalyses = analyses.filter(
    analysis => filter === 'all' || analysis.type === filter
  );

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'error': return '🔴';
      case 'warning': return '🟡';
      default: return '🔵';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'conflict': return '⚡ Conflict';
      case 'code_review': return '📝 Code Review';
      case 'suggestion': return '💡 Suggestion';
      case 'error': return '❌ Error';
      default: return 'ℹ️ Info';
    }
  };

  return (
    <div className="ai-panel">
      <div className="ai-panel-header">
        <h3>
          🤖 AI Assistant
          {isAnalyzing && <span className="analyzing-spinner"> Analyzing...</span>}
        </h3>
        <div className="ai-panel-controls">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All ({analyses.length})</option>
            <option value="conflict">Conflicts ({analyses.filter(a => a.type === 'conflict').length})</option>
            <option value="code_review">Reviews ({analyses.filter(a => a.type === 'code_review').length})</option>
            <option value="suggestion">Suggestions ({analyses.filter(a => a.type === 'suggestion').length})</option>
            <option value="error">Errors ({analyses.filter(a => a.type === 'error').length})</option>
          </select>
          <button onClick={onClearAll} className="clear-btn">Clear all</button>
        </div>
      </div>

      <div className="ai-panel-content">
        {filteredAnalyses.length === 0 ? (
          <div className="empty-state">
            <span>✅ No issues found</span>
            <p>AI will analyze code and show suggestions here</p>
          </div>
        ) : (
          filteredAnalyses.map((analysis) => (
            <div
              key={analysis.id}
              className={`analysis-card ${analysis.severity} ${analysis.type}`}
            >
              <div className="analysis-header" onClick={() => setExpandedId(expandedId === analysis.id ? null : analysis.id)}>
                <div className="analysis-title">
                  <span className="severity-icon">{getSeverityIcon(analysis.severity)}</span>
                  <span className="type-badge">{getTypeLabel(analysis.type)}</span>
                  <span className="line-info">Line {analysis.line}</span>
                </div>
                <button
                  className="dismiss-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDismiss(analysis.id);
                  }}
                >
                  ✕
                </button>
              </div>

              <div className="analysis-message">
                {analysis.message}
                {analysis.userId && (
                  <span className="user-tag">👤 User: {analysis.userId}</span>
                )}
              </div>

              {expandedId === analysis.id && (
                <div className="analysis-details">
                  {analysis.conflictData && (
                    <div className="conflict-resolution">
                      <h4>Conflict Resolution</h4>
                      <div className="conflict-options">
                        <div className="conflict-option">
                          <strong>{analysis.conflictData.users[0]?.name}:</strong>
                          <pre>{analysis.conflictData.users[0]?.code}</pre>
                          <button onClick={() => onResolveConflict(analysis.id, 'accept_first')}>
                            Accept this
                          </button>
                        </div>
                        <div className="conflict-option">
                          <strong>{analysis.conflictData.users[1]?.name}:</strong>
                          <pre>{analysis.conflictData.users[1]?.code}</pre>
                          <button onClick={() => onResolveConflict(analysis.id, 'accept_second')}>
                            Accept this
                          </button>
                        </div>
                        {analysis.conflictData.mergedCode && (
                          <div className="conflict-option merged">
                            <strong>🤖 AI Merge:</strong>
                            <pre>{analysis.conflictData.mergedCode}</pre>
                            <button onClick={() => onResolveConflict(analysis.id, 'ai_merge')}>
                              Apply AI Merge
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {analysis.suggestion && !analysis.conflictData && (
                    <div className="suggestion-action">
                      <pre className="suggestion-code">{analysis.suggestion}</pre>
                      <button onClick={() => onApplySuggestion(analysis.id)}>
                        Apply Suggestion
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};