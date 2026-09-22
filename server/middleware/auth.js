const jwt = require('jsonwebtoken');
const db = require('../database/db');

const JWT_SECRET = 'secret123'; // Weak secret intentionally for educational lab (Mission 12)

function authMiddleware(req, res, next) {
  let token = req.cookies?.cfx_session;

  // Check Authorization header if cookie not present
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    // 1. Check if token is raw JSON session or JWT
    if (token.startsWith('{') && token.endsWith('}')) {
      req.user = JSON.parse(token);
      return next();
    }

    // 2. Vulnerable JWT decoding logic for Mission 12:
    // Check if token has alg: none
    const parts = token.split('.');
    if (parts.length === 3) {
      const headerStr = Buffer.from(parts[0], 'base64').toString('utf8');
      const header = JSON.parse(headerStr);

      if (header.alg === 'none' || header.alg === 'NONE') {
        const payloadStr = Buffer.from(parts[1], 'base64').toString('utf8');
        req.user = JSON.parse(payloadStr);
        return next();
      }

      // Verify with weak secret
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        return next();
      } catch (jwtErr) {
        // If verification fails, try database lookup if token is session ID
      }
    }

    // 3. Fallback database user ID lookup
    const userId = parseInt(token, 10);
    if (!isNaN(userId)) {
      const user = db.get('SELECT id, username, full_name, email, role, balance, is_verified FROM users WHERE id = ?', [userId]);
      if (user) {
        req.user = user;
        return next();
      }
    }

    req.user = null;
    next();
  } catch (err) {
    req.user = null;
    next();
  }
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required. Please log in.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Access denied. Administrator privileges required.' });
  }
  next();
}

module.exports = {
  authMiddleware,
  requireAuth,
  requireAdmin,
  JWT_SECRET
};
