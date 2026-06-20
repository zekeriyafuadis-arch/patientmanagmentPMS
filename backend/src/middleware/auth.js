const jwt = require('jsonwebtoken');
const { get } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'saydoc-local-sqlite-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN
  || (process.env.NODE_ENV === 'production' ? '24h' : '7d');

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, fullName: user.full_name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  try {
    const decoded = verifyToken(token);
    const row = await get('SELECT id, email, full_name, role, active FROM staff WHERE id = ?', [decoded.id]);
    if (!row || !row.active) {
      return res.status(401).json({ success: false, error: 'Account inactive or not found' });
    }
    req.user = {
      id: row.id,
      email: row.email,
      role: row.role,
      fullName: row.full_name
    };
    req.staff = row;
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }
    next();
  };
}

async function attachStaff(req, res, next) {
  if (!req.user?.id) return next();
  const row = await get('SELECT id, email, full_name, role, active FROM staff WHERE id = ?', [req.user.id]);
  if (!row || !row.active) {
    return res.status(401).json({ success: false, error: 'Account inactive' });
  }
  req.staff = row;
  req.user.role = row.role;
  req.user.fullName = row.full_name;
  req.user.email = row.email;
  next();
}

module.exports = { signToken, verifyToken, requireAuth, requireRole, attachStaff, JWT_SECRET };
