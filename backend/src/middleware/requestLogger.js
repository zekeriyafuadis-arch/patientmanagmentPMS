const pinoHttp = require('pino-http');
const logger = require('../lib/logger');

const requestLogger = pinoHttp({
  logger,
  genReqId: (req) => req.id,
  customProps: (req) => ({
    userId: req.user?.id || null,
    role: req.user?.role || null
  }),
  customLogLevel(req, res, err) {
    if (err?.message === 'request aborted' && req.url?.includes('/events/stream')) {
      return 'silent';
    }
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    req(req) {
      return { method: req.method, url: req.url, id: req.id };
    },
    res(res) {
      return { statusCode: res.statusCode };
    }
  }
});

module.exports = requestLogger;
