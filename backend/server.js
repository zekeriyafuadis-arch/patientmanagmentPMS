try {
  require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
} catch {
  /* dotenv optional */
}

const { createApp, initDatabase } = require('./app');
const logger = require('./src/lib/logger');

const PORT = process.env.PORT || 3000;
const VERSION = '3.0.0';

initDatabase()
  .then(() => {
    const app = createApp();
    app.listen(PORT, () => {
      logger.info({
        version: VERSION,
        port: PORT,
        url: `http://localhost:${PORT}`,
        api: `http://localhost:${PORT}/api/v1`
      }, 'Dr Amin Specialty Dental Clinic PMS started');
    });
  })
  .catch((err) => {
    logger.fatal({ err }, 'Database initialization failed');
    process.exit(1);
  });
