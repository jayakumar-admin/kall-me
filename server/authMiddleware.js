const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'kallme_secret_key';

function getTokenFromHeader(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2) return null;
  const [scheme, token] = parts;
  if (!/^Bearer$/i.test(scheme)) return null;
  return token;
}

function authMiddleware(req, res, next) {
  const token = getTokenFromHeader(req);
  if (!token) {
    return res.status(401).json({ message: 'Authorization token missing.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('JWT verification failed:', err);
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

function softAuthMiddleware(req, res, next) {
  const token = getTokenFromHeader(req);
  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
  } catch (err) {
    // If the token is invalid/expired, we treat the request as anonymous.
    // Do not fail the request; just proceed without user info.
    console.warn('Soft auth: invalid token, continuing as anonymous.');
  }

  next();
}

function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: admin access required.' });
  }
  next();
}

module.exports = {
  authMiddleware,
  softAuthMiddleware,
  adminOnly,
};
