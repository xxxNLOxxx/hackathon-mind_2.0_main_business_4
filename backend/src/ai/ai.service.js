const axios = require('axios');

// Расширенный AI анализатор с множеством проверок
const analyzeCode = async (code, language) => {
  const analyses = [];
  const lines = code.split('\n');
  
  switch (language) {
    // ==================== JAVASCRIPT / TYPESCRIPT ====================
    case 'javascript':
    case 'typescript':
      lines.forEach((lineText, idx) => {
        const lineNum = idx + 1;
        
        // 1. Использование var
        if (lineText.includes('var ')) {
          analyses.push({
            id: Date.now() + Math.random() + idx,
            type: 'suggestion',
            severity: 'warning',
            line: lineNum,
            message: '📌 Используйте const или let вместо var (var имеет функциональную область видимости)',
            suggestion: lineText.replace(/var /g, 'const '),
          });
        }
        
        // 2. Нестрогое сравнение
        if (lineText.includes('==') && !lineText.includes('===') && !lineText.includes('!=')) {
          analyses.push({
            id: Date.now() + Math.random() + idx,
            type: 'suggestion',
            severity: 'warning',
            line: lineNum,
            message: '⚠️ Используйте === вместо == (строгое сравнение без приведения типов)',
            suggestion: lineText.replace(/==/g, '==='),
          });
        }
        
        // 3. console.log в продакшн коде
        if (lineText.includes('console.log') && !lineText.includes('//')) {
          analyses.push({
            id: Date.now() + Math.random() + idx,
            type: 'code_review',
            severity: 'info',
            line: lineNum,
            message: '📝 Уберите console.log перед публикацией в продакшн',
            suggestion: lineText.replace(/console\.log\(.*?\);?/, '// console.log removed'),
          });
        }
        
        // 4. Использование eval (опасно!)
        if (lineText.includes('eval(')) {
          analyses.push({
            id: Date.now() + Math.random() + idx,
            type: 'error',
            severity: 'error',
            line: lineNum,
            message: '🔴 НИКОГДА не используйте eval()! Это создает уязвимости',
            suggestion: lineText.replace(/eval\(.*?\)/, '// Используйте безопасную альтернативу'),
          });
        }
        
        
      });
      
      // 6. Проверка на глобальные переменные
      if (code.includes('window.') || code.includes('global.')) {
        analyses.push({
          id: Date.now() + Math.random(),
          type: 'suggestion',
          severity: 'warning',
          line: 1,
          message: '🌍 Избегайте глобальных переменных, используйте модули',
          suggestion: code.replace(/window\./g, '').replace(/global\./g, ''),
        });
      }
      break;
      
    // ==================== PYTHON ====================
    case 'python':
      lines.forEach((lineText, idx) => {
        const lineNum = idx + 1;
        
        // 1. print без скобок
        if (lineText.includes('print ') && !lineText.includes('print(')) {
          analyses.push({
            id: Date.now() + Math.random() + idx,
            type: 'suggestion',
            severity: 'warning',
            line: lineNum,
            message: '🐍 В Python 3 используйте print() с括号',
            suggestion: lineText.replace(/print (.+)/, 'print($1)'),
          });
        }
        
        // 2. Табуляция вместо пробелов
        if (lineText.includes('\t')) {
          analyses.push({
            id: Date.now() + Math.random() + idx,
            type: 'code_review',
            severity: 'info',
            line: lineNum,
            message: '📏 Используйте 4 пробела вместо табуляции (PEP 8)',
            suggestion: lineText.replace(/\t/g, '    '),
          });
        }
        
        // 3. Слишком длинная строка
        if (lineText.length > 79) {
          analyses.push({
            id: Date.now() + Math.random() + idx,
            type: 'code_review',
            severity: 'info',
            line: lineNum,
            message: '📏 Строка длиннее 79 символов (нарушение PEP 8)',
            suggestion: lineText,
          });
        }
        
        // 4. Голое except
        if (lineText.includes('except:') && !lineText.includes('except Exception')) {
          analyses.push({
            id: Date.now() + Math.random() + idx,
            type: 'error',
            severity: 'error',
            line: lineNum,
            message: '⚠️ Указывайте конкретные исключения, не используйте голый except',
            suggestion: lineText.replace('except:', 'except Exception as e:'),
          });
        }
        
        // 5. Использование == для сравнения с None
        if (lineText.includes('== None') || lineText.includes('!= None')) {
          analyses.push({
            id: Date.now() + Math.random() + idx,
            type: 'suggestion',
            severity: 'warning',
            line: lineNum,
            message: '🎯 Используйте "is None" или "is not None" вместо ==/!= None',
            suggestion: lineText.replace('== None', 'is None').replace('!= None', 'is not None'),
          });
        }
      });
      break;
      
    // ==================== HTML ====================
    case 'html':
      // 1. Отсутствие meta charset
      if (!code.includes('<meta charset')) {
        analyses.push({
          id: Date.now() + Math.random(),
          type: 'suggestion',
          severity: 'warning',
          line: 1,
          message: '🌐 Добавьте <meta charset="UTF-8"> для правильного отображения символов',
          suggestion: '<!DOCTYPE html>\n<html>\n<head>\n    <meta charset="UTF-8">\n' + code,
        });
      }
      
      lines.forEach((lineText, idx) => {
        const lineNum = idx + 1;
        
        // 2. Отсутствие alt у изображений
        if (lineText.includes('<img') && !lineText.includes('alt=')) {
          analyses.push({
            id: Date.now() + Math.random() + idx,
            type: 'suggestion',
            severity: 'warning',
            line: lineNum,
            message: '🖼️ Добавьте alt атрибут для изображений (важно для доступности и SEO)',
            suggestion: lineText.replace('<img', '<img alt="описание изображения" '),
          });
        }
        
        // 3. Устаревшие теги
        const deprecatedTags = ['<font', '<center', '<marquee', '<blink'];
        deprecatedTags.forEach(tag => {
          if (lineText.includes(tag)) {
            analyses.push({
              id: Date.now() + Math.random() + idx,
              type: 'suggestion',
              severity: 'warning',
              line: lineNum,
              message: `⚠️ Тег ${tag} устарел, используйте CSS вместо него`,
              suggestion: lineText.replace(new RegExp(tag, 'g'), '<!-- устаревший тег -->'),
            });
          }
        });
        
        // 4. Отсутствие lang атрибута
        if (lineText.includes('<html') && !lineText.includes('lang=')) {
          analyses.push({
            id: Date.now() + Math.random() + idx,
            type: 'code_review',
            severity: 'info',
            line: lineNum,
            message: '🌍 Добавьте атрибут lang для указания языка документа',
            suggestion: lineText.replace('<html', '<html lang="ru"'),
          });
        }
      });
      break;
      
    // ==================== CSS ====================
    case 'css':
      lines.forEach((lineText, idx) => {
        const lineNum = idx + 1;
        
        // 1. Использование !important
        if (lineText.includes('!important')) {
          analyses.push({
            id: Date.now() + Math.random() + idx,
            type: 'suggestion',
            severity: 'warning',
            line: lineNum,
            message: '🎨 Избегайте !important, используйте более специфичные селекторы',
            suggestion: lineText.replace('!important', ''),
          });
        }
        
        // 2. Использование абсолютных значений вместо относительных
        if (lineText.match(/width:\s*\d+px/) && !lineText.includes('100%') && !lineText.includes('max-width')) {
          analyses.push({
            id: Date.now() + Math.random() + idx,
            type: 'code_review',
            severity: 'info',
            line: lineNum,
            message: '📱 Используйте относительные единицы (rem, em, %, vh, vw) для адаптивности',
            suggestion: lineText.replace(/(\d+)px/, 'calc($1 / 16 * 1rem)'),
          });
        }
        
        // 3. Устаревшие цвета (hex вместо названий)
        const colorNames = ['red', 'blue', 'green', 'yellow', 'black', 'white'];
        colorNames.forEach(color => {
          if (lineText.includes(`: ${color}`) || lineText.includes(`:${color}`)) {
            analyses.push({
              id: Date.now() + Math.random() + idx,
              type: 'code_review',
              severity: 'info',
              line: lineNum,
              message: `🎨 Используйте hex или rgb вместо названия цвета "${color}" для консистентности`,
              suggestion: lineText.replace(`: ${color}`, ': #000000').replace(`:${color}`, ':#000000'),
            });
          }
        });
      });
      break;
      
    // ==================== SQL ====================
    case 'sql':
      lines.forEach((lineText, idx) => {
        const lineNum = idx + 1;
        const upperLine = lineText.toUpperCase();
        
        // 1. SELECT *
        if (upperLine.includes('SELECT *')) {
          analyses.push({
            id: Date.now() + Math.random() + idx,
            type: 'suggestion',
            severity: 'warning',
            line: lineNum,
            message: '🗄️ Избегайте SELECT *, указывайте конкретные поля (лучше производительность)',
            suggestion: lineText.replace(/SELECT \*/i, 'SELECT id, name, created_at'),
          });
        }
        
        // 2. Отсутствие WHERE в DELETE/UPDATE
        if ((upperLine.includes('DELETE') || upperLine.includes('UPDATE')) && !upperLine.includes('WHERE')) {
          analyses.push({
            id: Date.now() + Math.random() + idx,
            type: 'error',
            severity: 'error',
            line: lineNum,
            message: '⚠️ DELETE/UPDATE без WHERE удалит/обновит ВСЕ записи! Добавьте условие',
            suggestion: lineText,
          });
        }
      });
      break;
      
    // ==================== JAVA ====================
    case 'java':
      lines.forEach((lineText, idx) => {
        const lineNum = idx + 1;
        
        // 1. System.out.println
        if (lineText.includes('System.out.println')) {
          analyses.push({
            id: Date.now() + Math.random() + idx,
            type: 'code_review',
            severity: 'info',
            line: lineNum,
            message: '☕ В продакшн коде используйте логгер (SLF4J/Log4j) вместо System.out.println',
            suggestion: lineText.replace('System.out.println', 'logger.info'),
          });
        }
        
        // 2. Пустой catch блок
        if (lineText.includes('catch') && lineText.includes('{}') && !lineText.includes('e.')) {
          analyses.push({
            id: Date.now() + Math.random() + idx,
            type: 'error',
            severity: 'error',
            line: lineNum,
            message: '⚠️ Пустой catch блок скрывает ошибки! Обработайте исключение или залогируйте',
            suggestion: lineText.replace('{}', '{ e.printStackTrace(); }'),
          });
        }
      });
      break;
      
    // ==================== C++ ====================
    case 'cpp':
    case 'c++':
      lines.forEach((lineText, idx) => {
        const lineNum = idx + 1;
        
        // 1. Сырые указатели вместо умных
        if (lineText.includes('new ') && !lineText.includes('shared_ptr') && !lineText.includes('unique_ptr')) {
          analyses.push({
            id: Date.now() + Math.random() + idx,
            type: 'suggestion',
            severity: 'warning',
            line: lineNum,
            message: '⚙️ Используйте умные указатели (shared_ptr/unique_ptr) вместо raw pointer new',
            suggestion: lineText.replace('new ', 'make_unique<'),
          });
        }
        
        // 2. Отсутствие delete
        if (lineText.includes('new ') && !code.includes('delete')) {
          analyses.push({
            id: Date.now() + Math.random() + idx,
            type: 'error',
            severity: 'error',
            line: lineNum,
            message: '⚠️ Потенциальная утечка памяти: new без delete',
            suggestion: lineText,
          });
        }
      });
      break;
      
    // ==================== GO ====================
    case 'go':
      lines.forEach((lineText, idx) => {
        const lineNum = idx + 1;
        
        // 1. Необработанная ошибка
        if (lineText.includes('return') && lineText.includes('err') && !lineText.includes('if err != nil')) {
          analyses.push({
            id: Date.now() + Math.random() + idx,
            type: 'suggestion',
            severity: 'warning',
            line: lineNum,
            message: '🐹 Всегда обрабатывайте ошибки в Go: if err != nil',
            suggestion: lineText,
          });
        }
      });
      break;
      
    // ==================== RUST ====================
    case 'rust':
      lines.forEach((lineText, idx) => {
        const lineNum = idx + 1;
        
        // 1. unwrap() вместо обработки
        if (lineText.includes('.unwrap()')) {
          analyses.push({
            id: Date.now() + Math.random() + idx,
            type: 'suggestion',
            severity: 'warning',
            line: lineNum,
            message: '🦀 Избегайте unwrap(), используйте match или ? для обработки ошибок',
            suggestion: lineText.replace('.unwrap()', '.expect("error message")'),
          });
        }
      });
      break;
      
    // ==================== JSON ====================
    case 'json':
      try {
        JSON.parse(code);
      } catch (e) {
        analyses.push({
          id: Date.now() + Math.random(),
          type: 'error',
          severity: 'error',
          line: 1,
          message: `❌ Невалидный JSON: ${e.message}`,
          suggestion: '',
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