const rateLimit = require('express-rate-limit');
const { sendError } = require('../lib/apiResponse');

function limiterHandler(req, res) {
  sendError(res, req, 429, 'RATE_LIMITED', 'Too many requests. Please try again later.');
}

function shouldSkipRateLimit() {
  return process.env.PMS_DISABLE_RATE_LIMIT === '1';
}

const authLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX, 10) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => shouldSkipRateLimit(),
  handler: limiterHandler
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => shouldSkipRateLimit()
    || req.path === '/admin/health'
    || req.path === '/auth/config'
    || req.originalUrl?.includes('/auth/config'),
  handler: limiterHandler
});

const adminBackupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_BACKUP_MAX, 10) || 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => shouldSkipRateLimit(),
  handler: limiterHandler
});

module.exports = { authLoginLimiter, apiLimiter, adminBackupLimiter };
