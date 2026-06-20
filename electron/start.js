const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

function waitForHealth(port = 3000, attempts = 40) {
  return new Promise((resolve, reject) => {
    let tries = 0;
    const check = () => {
      const req = http.request({
        hostname: 'localhost',
        port,
        path: '/api/v1/admin/health',
        method: 'GET',
        timeout: 1000
      }, (res) => {
        if (res.statusCode === 200) resolve();
        else if (++tries >= attempts) reject(new Error('Health check failed'));
        else setTimeout(check, 500);
      });
      req.on('error', () => {
        if (++tries >= attempts) reject(new Error('Server did not start'));
        else setTimeout(check, 500);
      });
      req.end();
    };
    check();
  });
}

const root = path.join(__dirname, '..');
const backend = spawn('node', ['backend/server.js'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' }
});

backend.on('error', (err) => {
  console.error('Failed to start backend:', err);
  process.exit(1);
});

waitForHealth()
  .then(() => {
    const electron = require('electron');
    const { app } = electron;
    app.on('ready', () => {
      require('./main');
    });
  })
  .catch((err) => {
    console.error(err.message);
    backend.kill();
    process.exit(1);
  });

process.on('SIGINT', () => {
  backend.kill();
  process.exit(0);
});
