const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { initDatabase, uploadsDir } = require('./src/config/database');
const apiRoutes = require('./src/routes/v1');
const requestId = require('./src/middleware/requestId');
const requestLogger = require('./src/middleware/requestLogger');
const errorHandler = require('./src/middleware/errorHandler');
const { authLoginLimiter, apiLimiter, adminBackupLimiter } = require('./src/middleware/rateLimiter');

function createApp() {
  const app = express();
  const frontendDir = path.join(__dirname, '..', 'frontend');

  app.set('trust proxy', 1);
  app.use(requestId);
  app.use(requestLogger);
  app.use(cors());
  app.use(bodyParser.json({ limit: '25mb' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '25mb' }));

  app.use('/uploads', express.static(uploadsDir));

  const v1 = '/api/v1';
  app.use(`${v1}/auth/login`, authLoginLimiter);
  app.use(`${v1}/admin/backup`, adminBackupLimiter);
  app.use(`${v1}/admin/restore`, adminBackupLimiter);
  app.use(v1, apiLimiter);
  app.use(v1, apiRoutes);

  // Legacy alias during migration
  app.use('/api/auth/login', authLoginLimiter);
  app.use('/api/admin/backup', adminBackupLimiter);
  app.use('/api/admin/restore', adminBackupLimiter);
  app.use('/api', apiLimiter);
  app.use('/api', apiRoutes);

  app.use(express.static(frontendDir));

  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDir, 'index.html'));
  });

  app.use(errorHandler);
  return app;
}

module.exports = { createApp, initDatabase };
