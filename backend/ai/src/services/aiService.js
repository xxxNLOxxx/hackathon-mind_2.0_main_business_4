import axios from 'axios';
import { AI_CONFIG } from '../config/aiConfig.js';

export class AIService {
  async reviewCode(code, language = 'javascript') {
    // Пустой код - сразу возвращаем
    if (!code || code.trim().length === 0) {
      return { issues: [] };
    }

    // Слишком длинный код - предупреждаем
    const lines = code.split('\n');
    if (lines.length > AI_CONFIG.maxCodeLength) {
      return {
        issues: [{
          type: 'warning',
          message: `Код слишком длинный (${lines.length} строк). Анализирую только первые ${AI_CONFIG.maxCodeLength} строк.`,
          line: null,
          suggestion: 'Разбейте код на части'
        }]
      };
    }

    try {
      const prompt = this.buildPrompt(code, language);
      const llmResponse = await this.callOpenRouter(prompt);
      const result = this.parseResponse(llmResponse);
      return result;
    } catch (error) {
      console.error('AI ошибка:', error.message);
      return this.getErrorResponse(error);
    }
  }

  buildPrompt(code, language) {
    return `Ты — AI code reviewer. Анализируй код на ${language}.

Найди:
- ошибки (синтаксические, логические)
- антипаттерны
- потенциальные баги
- улучшения по best practices

Верни ТОЛЬКО JSON (никакого текста до или после):

{
  "issues": [
    {
      "type": "error | warning | suggestion",
      "message": "описание проблемы",
      "line": номер строки (число или null),
      "suggestion": "исправленный код или null"
    }
  ]
}

Если проблем нет: {"issues": []}

Код:
\`\`\`${language}
${code}
\`\`\``;
  }

  async callOpenRouter(prompt) {
    // Если нет API ключа - демо режим
    if (!AI_CONFIG.apiKey || AI_CONFIG.apiKey === 'sk-or-v1-сюда_твой_ключ_который_скопировал') {
      console.log('Демо режим: нет API ключа');
      return this.getDemoResponse();
    }

    const response = await axios.post(
      AI_CONFIG.apiUrl,
      {
        model: AI_CONFIG.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'AI Code Reviewer'
        },
        timeout: AI_CONFIG.timeout
      }
    );

    const content = response.data.choices[0].message.content;
    return content;
  }

  parseResponse(llmResponse) {
    try {
      // Ищем JSON в ответе
      let jsonStr = llmResponse;
      
      // Если ответ в markdown блоке
      const jsonMatch = llmResponse.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      } else {
        // Ищем первый { и последний }
        const start = llmResponse.indexOf('{');
        const end = llmResponse.lastIndexOf('}') + 1;
        if (start !== -1 && end !== -1) {
          jsonStr = llmResponse.substring(start, end);
        }
      }
      
      const parsed = JSON.parse(jsonStr);
      
      if (!parsed.issues || !Array.isArray(parsed.issues)) {
        throw new Error('Неверная структура');
      }
      
      return parsed;
    } catch (error) {
      console.error('Ошибка парсинга:', error.message);
      return { issues: [] };
    }
  }

  getDemoResponse() {
    // Демо-ответы для показа (без API ключа)
    return JSON.stringify({
      issues: [
        {
          type: 'error',
          message: 'Используйте const/let вместо var',
          line: 1,
          suggestion: 'const x = 10;'
        },
        {
          type: 'warning',
          message: 'Добавьте точку с запятой',
          line: 2,
          suggestion: 'const y = 20;'
        },
        {
          type: 'suggestion',
          message: 'Используйте строгое равенство (===) вместо (==)',
          line: 5,
          suggestion: 'if (a === b)'
        }
      ]
    });
  }

  getErrorResponse(error) {
    if (error.code === 'ECONNABORTED') {
      return {
        issues: [{
          type: 'error',
          message: 'AI сервис не отвечает. Попробуйте позже.',
          line: null,
          suggestion: null
        }]
      };
    }
    
    return {
      issues: [{
        type: 'error',
        message: `Ошибка AI: ${error.message}`,
        line: null,
        suggestion: null
      }]
    };
  }
}