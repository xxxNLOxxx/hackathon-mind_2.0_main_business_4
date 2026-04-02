const Docker = require('dockerode');
const docker = new Docker();

// Запуск кода в Docker контейнере
const runCode = async (req, res) => {
  const { code, language, stdin = '', timeoutMs = 5000 } = req.body;
  
  let container = null;
  const startTime = Date.now();
  
  try {
    // Выбираем образ в зависимости от языка
    const imageMap = {
      javascript: 'node:18-alpine',
      python: 'python:3.11-alpine',
      html: 'alpine',
      java: 'openjdk:17-slim',
    };
    
    const image = imageMap[language] || 'node:18-alpine';
    
    // Команда для выполнения
    const commandMap = {
      javascript: `node -e "${code.replace(/"/g, '\\"')}"`,
      python: `python -c "${code.replace(/"/g, '\\"')}"`,
      html: `echo "${code.replace(/"/g, '\\"')}"`,
    };
    
    const cmd = commandMap[language] || commandMap.javascript;
    
    // Создаем контейнер
    container = await docker.createContainer({
      Image: image,
      Cmd: ['sh', '-c', cmd],
      AttachStdout: true,
      AttachStderr: true,
      HostConfig: {
        Memory: 128 * 1024 * 1024, // 128MB
        MemorySwap: 0,
        CpuPeriod: 100000,
        CpuQuota: 50000,
        NetworkMode: 'none',
        AutoRemove: true,
      },
    });
    
    // Запускаем
    await container.start();
    
    // Ждем завершения с таймаутом
    const timeout = setTimeout(async () => {
      if (container) {
        await container.kill();
      }
    }, timeoutMs);
    
    // Получаем вывод
    const logs = await container.logs({
      follow: false,
      stdout: true,
      stderr: true,
    });
    
    clearTimeout(timeout);
    
    const output = logs.toString('utf-8');
    const duration = Date.now() - startTime;
    
    res.json({
      stdout: output || '// No output',
      stderr: '',
      exitCode: 0,
      durationMs: duration,
      meta: { language, timeoutMs },
    });
    
  } catch (error) {
    console.error('Sandbox error:', error);
    res.json({
      stdout: '',
      stderr: error.message,
      exitCode: 1,
      durationMs: Date.now() - startTime,
      meta: { error: true },
    });
  }
};

module.exports = { runCode };