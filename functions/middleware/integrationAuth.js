const crypto = require('crypto');
const { sendError } = require('../utils/integrationResponse');

// In-memory sliding window rate limiter for integration endpoints
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 120; // 120 requests per minute

/**
 * Periodically purge old rate limit entries to prevent memory leaks
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now - record.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000).unref?.();

/**
 * Perform constant-time comparison between incoming key and configured keys (supports rotation)
 */
function verifyApiKey(incomingKey, configuredKeySetting) {
  if (!incomingKey || typeof incomingKey !== 'string') return false;
  if (!configuredKeySetting || typeof configuredKeySetting !== 'string') return false;

  const candidateKeys = configuredKeySetting
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  if (candidateKeys.length === 0) return false;

  const incomingHash = crypto.createHash('sha256').update(incomingKey).digest();

  for (const configuredKey of candidateKeys) {
    const configuredHash = crypto.createHash('sha256').update(configuredKey).digest();
    // Timing-safe comparison of sha256 digests eliminates length leakage and timing discrepancies
    if (crypto.timingSafeEqual(incomingHash, configuredHash)) {
      return true;
    }
  }

  return false;
}

/**
 * In-memory rate limiting check
 */
function isRateLimited(identifier) {
  const now = Date.now();
  let record = rateLimitMap.get(identifier);

  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
    record = { windowStart: now, count: 1 };
    rateLimitMap.set(identifier, record);
    return false;
  }

  record.count += 1;
  return record.count > MAX_REQUESTS_PER_WINDOW;
}

/**
 * Integration Authentication & Resource Authorization Middleware Factory
 * @param {string} resourceName - The resource being accessed ('health', 'logs', 'inventory', 'billing', 'backups')
 */
function createIntegrationAuth(resourceName) {
  return function integrationAuth(req, res, next) {
    // 1. Rate Limiting Check
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const rateLimitKey = `${clientIp}:${resourceName}`;

    if (isRateLimited(rateLimitKey)) {
      return sendError(
        res,
        429,
        'RATE_LIMIT_EXCEEDED',
        'Integration request rate limit exceeded. Please retry after some time.',
        { req, retryable: true }
      );
    }

    // 2. Check if TaskHub Integration is enabled
    const isEnabled = process.env.TASKHUB_INTEGRATION_ENABLED === 'true';
    if (!isEnabled) {
      return sendError(
        res,
        503,
        'INTEGRATION_DISABLED',
        'TaskHub integration is currently disabled on this server.',
        { req, retryable: true }
      );
    }

    // 3. Read configured API key from server environment
    const configuredApiKey = process.env.TASKHUB_INTEGRATION_API_KEY;
    if (!configuredApiKey || configuredApiKey.trim().length === 0) {
      return sendError(
        res,
        503,
        'INTEGRATION_NOT_CONFIGURED',
        'TaskHub integration is temporarily unavailable due to missing server configuration.',
        { req, retryable: true }
      );
    }

    // 4. Extract supplied API key or auth token (headers or query parameters)
    let incomingApiKey =
      req.headers['x-api-key'] ||
      req.headers['X-API-Key'] ||
      req.headers['x-taskhub-key'] ||
      req.headers['x-integration-key'] ||
      (req.query && (req.query.apiKey || req.query.api_key || req.query.key)) ||
      null;

    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    let isJwtAdmin = false;

    if (!incomingApiKey && authHeader && typeof authHeader === 'string') {
      const trimmedAuth = authHeader.trim();
      if (trimmedAuth.startsWith('ApiKey ')) {
        incomingApiKey = trimmedAuth.slice(7).trim();
      } else if (trimmedAuth.startsWith('Bearer ')) {
        const token = trimmedAuth.slice(7).trim();
        if (verifyApiKey(token, configuredApiKey)) {
          incomingApiKey = token;
        } else {
          // Check if token is a valid admin JWT
          try {
            const jwt = require('jsonwebtoken');
            const JWT_SECRET = process.env.JWT_SECRET || 'kallme_secret_key';
            const decoded = jwt.verify(token, JWT_SECRET);
            if (decoded && (decoded.role === 'admin' || decoded.role === 'administrator')) {
              isJwtAdmin = true;
              incomingApiKey = token;
            }
          } catch (jwtErr) {
            // Not a valid JWT token
          }
        }
      }
    }

    if (!incomingApiKey) {
      return sendError(
        res,
        401,
        'UNAUTHORIZED',
        'Missing or invalid integration API key.',
        { req, retryable: false }
      );
    }

    // 5. Compare secret values safely using constant-time comparison
    if (!isJwtAdmin) {
      const isValidKey = verifyApiKey(incomingApiKey, configuredApiKey);
      if (!isValidKey) {
        return sendError(
          res,
          401,
          'UNAUTHORIZED',
          'Missing or invalid integration API key.',
          { req, retryable: false }
        );
      }
    }

    // 1. HTTPS requirement in production (exempting localhost / 127.0.0.1 for local testing)
    if (
      process.env.NODE_ENV === 'production' &&
      !req.secure &&
      req.headers['x-forwarded-proto'] !== 'https' &&
      req.hostname !== 'localhost' &&
      req.hostname !== '127.0.0.1'
    ) {
      return sendError(
        res,
        403,
        'HTTPS_REQUIRED',
        'HTTPS is required for integration API requests in production.',
        { req, retryable: false }
      );
    }

    // 2. Check requested resource against configured permissions
    const allowedResourcesSetting =
      process.env.TASKHUB_INTEGRATION_ALLOWED_RESOURCES ||
      'health,metrics,logs,traffic,deployments,inventory,billing,backups,diagnostics';

    const allowedResources = allowedResourcesSetting
      .split(',')
      .map((r) => r.trim().toLowerCase())
      .filter(Boolean);

    const targetResource = String(resourceName || 'general').trim().toLowerCase();

    if (!allowedResources.includes(targetResource) && !allowedResources.includes('*')) {
      return sendError(
        res,
        403,
        'FORBIDDEN_RESOURCE',
        `Access to resource '${targetResource}' is not permitted by server configuration.`,
        { req, retryable: false }
      );
    }

    // 7. Attach authenticated integration identity to request context
    req.integration = {
      keyId: process.env.TASKHUB_INTEGRATION_KEY_ID || 'kallme-default',
      applicationId: process.env.TASKHUB_APPLICATION_ID || 'kall-me',
      environment: process.env.TASKHUB_ENVIRONMENT || process.env.NODE_ENV || 'production',
      resource: targetResource,
      authenticatedAt: new Date().toISOString()
    };

    // 8. Allow request to continue
    next();
  };
}

module.exports = {
  createIntegrationAuth,
  verifyApiKey
};
