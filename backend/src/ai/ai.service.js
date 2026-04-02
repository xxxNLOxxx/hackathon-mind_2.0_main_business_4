const axios = require('axios');

// Локальный AI анализатор (можно заменить на OpenAI)
const analyzeCode = async (code, language) => {
  const analyses = [];
  const lines = code.split('\n');
  
  switch (language) {
    case 'javascript':
      lines.forEach((lineText, idx) => {
        if (lineText.includes('var ')) {
          analyses.push({
            id: Date.now() + Math.random() + idx,
            type: 'suggestion',
            severity: 'warning',
            line: idx + 1,
            message: '⚠️ Используйте const или let вместо var',
            suggestion: lineText.replace(/var /g, 'const '),
          });
        }
        if (lineText.includes('==') && !lineText.includes('===')) {
          analyses.push({
            id: Date.now() + Math.random() + idx,
            type: 'suggestion',
            severity: 'warning',
            line: idx + 1,
            message: '⚠️ Используйте === вместо ==',
            suggestion: lineText.replace(/==/g, '==='),
          });
        }
      });
      break;
      
    case 'python':
      lines.forEach((lineText, idx) => {
        if (lineText.includes('print ') && !lineText.includes('print(')) {
          analyses.push({
            id: Date.now() + Math.random() + idx,
            type: 'suggestion',
            severity: 'warning',
            line: idx + 1,
            message: '🐍 Используйте print() с括号',
            suggestion: lineText.replace(/print (.+)/, 'print($1)'),
          });
        }
      });
      break;
      
    case 'html':
      if (!code.includes('<meta charset')) {
        analyses.push({
          id: Date.now() + Math.random(),
          type: 'suggestion',
          severity: 'info',
          line: 1,
          message: '🌐 Добавьте <meta charset="UTF-8">',
          suggestion: '<meta charset="UTF-8">\n' + code,
        });
      }
      break;
  }
  
  return analyses;
};

// Обработчик AI запросов
const aiReview = async (req, res) => {
  const { code, language, roomId, userId, line } = req.body;
  
  try {
    const analyses = await analyzeCode(code, language);
    
    res.json({
      success: true,
      analyses: analyses.map(a => ({
        ...a,
        roomId,
        userId,
        timestamp: new Date(),
      })),
    });
  } catch (error) {
    console.error('AI error:', error);
    res.json({
      success: false,
      analyses: [],
      error: error.message,
    });
  }
};

module.exports = { aiReview };