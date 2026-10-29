// ============================================================
// Bitrix24 ↔ Listok Integration — Authentication Middleware
// ============================================================

const jwt = require('jsonwebtoken');
const { query } = require('../db/client');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Authenticate a request via Bearer token (JWT) or API key header.
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'];

    // Try JWT Bearer token first
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      return next();
    }

    // Fall back to API key lookup
    if (apiKey) {
      const result = await query(
        'SELECT id, name FROM integrations WHERE id = $1 AND status = $2',
        [apiKey, 'active']
      );
      if (result.rows.length > 0) {
        req.user = { id: result.rows[0].id, name: result.rows[0].name };
        return next();
      }
    }

    // No valid credentials
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Provide a valid Bearer token or X-API-Key header',
    });
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    logger.error('Authentication error', { error: err.message });
    return res.status(500).json({ error: 'Internal authentication error' });
  }
}

/**
 * Generate a JWT for a given user/integration.
 */
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

module.exports = { authenticate, generateToken };
