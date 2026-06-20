const logger = require('../lib/logger');
const { sendError } = require('../lib/apiResponse');

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const status = err.status || err.statusCode || 500;
  const code = err.code || (status === 429 ? 'RATE_LIMITED' : status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_FAILED');
  const message = err.expose || status < 500
    ? (err.message || 'Request failed')
    : 'Internal server error';

  if (status >= 500) {
    logger.error({ err, requestId: req.id, path: req.path }, message);
  } else {
    logger.warn({ requestId: req.id, path: req.path, code }, message);
  }

  sendError(res, req, status, code, message);
}

module.exports = errorHandler;
