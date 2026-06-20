try {
  require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
} catch {
  /* dotenv optional */
}

const { validateProductionEnvironment } = require('./src/config/production');
validateProductionEnvironment();

const { createApp, initDatabase } = require('./app');
const logger = require('./src/lib/logger');
const { closeDatabase } = require('./src/config/database');
const { getLanAddresses } = require('./src/utils/networkUrls');
const { startAutoBackupScheduler } = require('./src/utils/autoBackup');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = process.env.PMS_HOST || '0.0.0.0';
const VERSION = '3.0.0';

let server;

function shutdown(signal) {
  logger.info({ signal }, 'Shutting down gracefully');
  if (!server) {
    process.exit(0);
    return;
  }

  server.close(async () => {
    try {
      await closeDatabase();
      logger.info('Shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

initDatabase()
  .then(() => {
    const app = createApp();
    server = app.listen(PORT, HOST, () => {
      const lanUrls = getLanAddresses(PORT);
      logger.info({
        version: VERSION,
        host: HOST,
        port: PORT,
        url: `http://localhost:${PORT}`,
        lanUrls,
        api: `http://localhost:${PORT}/api/v1`,
        environment: process.env.NODE_ENV || 'development'
      }, 'Dr Amin Specialty Dental Clinic PMS started');
      startAutoBackupScheduler();
    });
  })
  .catch((err) => {
    logger.fatal({ err }, 'Database initialization failed');
    process.exit(1);
  });
