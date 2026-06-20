const helmet = require('helmet');
const cors = require('cors');

function isPrivateOrLocalHost(hostname) {
  if (!hostname) return false;
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
  if (/^10\./.test(hostname)) return true;
  if (/^192\.168\./.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return true;
  return false;
}

function parseAllowedOrigins() {
  const raw = process.env.PMS_CORS_ORIGINS || '';
  return raw.split(',').map((entry) => entry.trim()).filter(Boolean);
}

function corsOriginCallback(origin, callback) {
  if (!origin) return callback(null, true);

  try {
    const url = new URL(origin);
    if (isPrivateOrLocalHost(url.hostname)) return callback(null, true);

    const allowed = parseAllowedOrigins();
    if (allowed.includes(origin) || allowed.includes(url.hostname)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS policy'));
  } catch {
    return callback(new Error('Invalid origin'));
  }
}

function applySecurityMiddleware(app) {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'", 'https://cdnjs.cloudflare.com', "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        fontSrc: ["'self'", 'https://cdnjs.cloudflare.com', 'data:'],
        connectSrc: ["'self'"],
        workerSrc: ["'self'"],
        manifestSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'same-site' }
  }));

  if (process.env.NODE_ENV === 'production') {
    app.use(cors({ origin: corsOriginCallback, credentials: true }));
  } else {
    app.use(cors());
  }
}

module.exports = { applySecurityMiddleware, isPrivateOrLocalHost };
