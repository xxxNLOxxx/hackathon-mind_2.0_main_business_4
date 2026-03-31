const express = require('express');
const cors = require('cors');
const Docker = require('dockerode');

const app = express();
const PORT = process.env.PORT || 3003;

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

app.use(cors());
app.use(express.json({ limit: '50kb' }));

// Ограничения
const EXECUTION_TIMEOUT = 5000;
const MAX_OUTPUT_SIZE = 1024 * 1024; // 1MB

// Образы
const IMAGES = {
  js: {
    image: 'node:18-alpine',
    cmd: (code) => ['node', '-e', code]
  },
  py: {
    image: 'python:3.11-alpine',
    cmd: (code) => ['python', '-c', code]
  }
};

// Pull image если нет
async function ensureImage(image) {
  const images = await docker.listImages();
  const exists = images.some(img =>
    img.RepoTags && img.RepoTags.includes(image)
  );

  if (exists) return;

  return new Promise((resolve, reject) => {
    docker.pull(image, (err, stream) => {
      if (err) return reject(err);

      docker.modem.followProgress(stream, (err) =>
        err ? reject(err) : resolve()
      );
    });
  });
}

// Основной endpoint
app.post('/run', async (req, res) => {
  const { code, language = 'js' } = req.body;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Invalid code' });
  }

  if (!IMAGES[language]) {
    return res.status(400).json({
      error: `Unsupported language: ${language}`
    });
  }

  const { image, cmd } = IMAGES[language];

  let container;

  try {
    await ensureImage(image);

    container = await docker.createContainer({
      Image: image,
      Cmd: cmd(code),

      Tty: false,
      OpenStdin: false,

      AttachStdout: true,
      AttachStderr: true,

      HostConfig: {
        AutoRemove: true,

        Memory: 128 * 1024 * 1024,
        MemorySwap: 0,

        CpuPeriod: 100000,
        CpuQuota: 50000,

        PidsLimit: 64,
        NetworkMode: 'none',

        SecurityOpt: ['no-new-privileges']
      }
    });

    const stream = await container.attach({
      stream: true,
      stdout: true,
      stderr: true
    });

    let output = '';
    let killed = false;

    stream.on('data', (chunk) => {
      if (output.length < MAX_OUTPUT_SIZE) {
        output += chunk.toString('utf8');
      }
    });

    await container.start();

    // Таймаут
    const timeout = setTimeout(async () => {
      killed = true;
      try {
        await container.kill();
      } catch (_) {}
    }, EXECUTION_TIMEOUT);

    await container.wait();
    clearTimeout(timeout);

    res.json({
      output: output.trim(),
      error: killed
        ? 'Execution timeout'
        : false
    });

  } catch (err) {
    res.status(500).json({
      output: err.message,
      error: true
    });
  } finally {
    // Подстраховка (если AutoRemove не сработал)
    if (container) {
      try {
        await container.remove({ force: true });
      } catch (_) {}
    }
  }
});

app.listen(PORT, () => {
  console.log(`Sandbox running on port ${PORT}`);
});