import express from 'express';
import cors from 'cors';
import { AIService } from './services/aiService.js';
import { AI_CONFIG } from './config/aiConfig.js';

const app = express();
const aiService = new AIService();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Проверка здоровья сервера
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'ai-reviewer',
    model: AI_CONFIG.model,
    timestamp: new Date().toISOString()
  });
});

// Главный эндпоинт
app.post('/ai-review', async (req, res) => {
  try {
    const { code, language = 'javascript' } = req.body;
    
    if (!code) {
      return res.status(400).json({
        issues: [{
          type: 'error',
          message: 'Поле "code" обязательно',
          line: null,
          suggestion: null
        }]
      });
    }
    
    console.log(`Анализирую ${code.length} символов...`);
    const result = await aiService.reviewCode(code, language);
    console.log(`Найдено ${result.issues.length} проблем`);
    
    res.json(result);
    
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({
      issues: [{
        type: 'error',
        message: 'Внутренняя ошибка сервера',
        line: null,
        suggestion: null
      }]
    });
  }
});

app.listen(AI_CONFIG.port, () => {
  console.log(`
╔══════════════════════════════════════════╗
║     AI Code Reviewer                  ║
╠══════════════════════════════════════════╣
║  Запущен на порту: ${AI_CONFIG.port}        ║
║  Модель: ${AI_CONFIG.model}     ║
║  API: http://localhost:${AI_CONFIG.port}/ai-review ║
║  Health: http://localhost:${AI_CONFIG.port}/health  ║
╚══════════════════════════════════════════╝
  `);
});