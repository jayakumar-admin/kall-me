const axios = require('axios');
const crypto = require('crypto');
const { getRequestId, getApplicationId, getEnvironment } = require('./integrationResponse');

const MAX_QUEUE_SIZE = 100;
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

// Bounded in-memory queue for asynchronous, non-blocking error reporting
const errorQueue = [];
let isWorkerRunning = false;

/**
 * Redact sensitive fields from any object or URL
 */
function sanitizeObject(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 3) return obj;
  if (Array.isArray(obj)) return obj.map((item) => sanitizeObject(item, depth + 1));

  const sanitized = {};
  const sensitiveRegex = /password|secret|token|api[-_]?key|authorization|cookie|session|credit[-_]?card/i;

  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveRegex.test(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, depth + 1);
    } else if (typeof value === 'string' && value.length > 500) {
      sanitized[key] = value.slice(0, 500) + '...[TRUNCATED]';
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Sanitize error message to prevent database connection string or credentials leaks
 */
function sanitizeErrorMessage(message) {
  if (!message || typeof message !== 'string') return 'An unexpected error occurred';
  return message
    .replace(/(postgres|mysql|mongodb|redis):\/\/[^@]+@/gi, '$1://[REDACTED]@')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .replace(/(api[_-]?key|secret|password)=[^&\s]+/gi, '$1=[REDACTED]');
}

/**
 * Process the error reporting queue with bounded backoff
 */
async function processQueue() {
  if (isWorkerRunning || errorQueue.length === 0) return;
  isWorkerRunning = true;

  while (errorQueue.length > 0) {
    const item = errorQueue[0];
    const ingestionUrl = process.env.TASKHUB_ERROR_INGESTION_URL;
    const apiKey = process.env.TASKHUB_ERROR_REPORTING_API_KEY;

    if (!ingestionUrl || !apiKey) {
      // Configuration was removed or invalid; drop queue item
      errorQueue.shift();
      continue;
    }

    try {
      await axios.post(ingestionUrl, item.payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
          'Authorization': `Bearer ${apiKey}`,
          'X-Source-Application': item.payload.applicationId || 'kall-me'
        },
        timeout: 5000
      });
      // Success: dequeue item
      errorQueue.shift();
    } catch (deliveryErr) {
      item.attempts = (item.attempts || 0) + 1;
      if (item.attempts >= MAX_RETRIES) {
        console.warn(
          `[TaskHub Error Reporter] Dropping event after ${MAX_RETRIES} failed attempts:`,
          deliveryErr.message
        );
        errorQueue.shift();
      } else {
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, item.attempts - 1);
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }
  }

  isWorkerRunning = false;
}

/**
 * Enqueue an error event for asynchronous dispatch to TaskHub
 */
function reportErrorToTaskHub(err, req = null, extraContext = {}) {
  // Check if error reporting is explicitly enabled
  const isEnabled = process.env.TASKHUB_ERROR_REPORTING_ENABLED === 'true';
  const ingestionUrl = process.env.TASKHUB_ERROR_INGESTION_URL;
  const reportingKey = process.env.TASKHUB_ERROR_REPORTING_API_KEY;

  if (!isEnabled || !ingestionUrl || !reportingKey) {
    return; // Disabled or not configured
  }

  // Prevent memory unbounded growth
  if (errorQueue.length >= MAX_QUEUE_SIZE) {
    console.warn('[TaskHub Error Reporter] Queue full, dropping oldest event');
    errorQueue.shift();
  }

  const requestId = getRequestId(req);
  const route = req ? (req.baseUrl || '') + (req.path || req.url || '') : extraContext.route || 'unknown';
  const method = req ? req.method : extraContext.method || 'SYSTEM';

  const safeHeaders = req && req.headers ? sanitizeObject({ ...req.headers }) : {};
  delete safeHeaders.cookie;
  delete safeHeaders.authorization;
  delete safeHeaders['x-api-key'];

  const sanitizedMessage = sanitizeErrorMessage(err?.message || String(err));
  const errorCode = err?.code || extraContext.errorCode || 'UNHANDLED_ERROR';

  const payload = {
    applicationId: getApplicationId(),
    environment: getEnvironment(),
    timestamp: new Date().toISOString(),
    severity: extraContext.severity || 'error',
    errorCode,
    message: sanitizedMessage,
    route,
    httpMethod: method,
    requestId,
    metadata: {
      errorType: err?.name || 'Error',
      statusCode: extraContext.statusCode || 500,
      headers: safeHeaders,
      query: req?.query ? sanitizeObject(req.query) : undefined,
      nodeVersion: process.version,
      uptimeSeconds: Math.floor(process.uptime()),
      ...sanitizeObject(extraContext.metadata || {})
    }
  };

  errorQueue.push({
    payload,
    attempts: 0,
    enqueuedAt: Date.now()
  });

  // Trigger background queue processing without awaiting or delaying
  setImmediate(() => {
    processQueue().catch((qErr) => {
      console.warn('[TaskHub Error Reporter] Worker execution error:', qErr.message);
    });
  });
}

/**
 * Express error-handling middleware that reports unhandled errors and returns sanitized response
 */
function taskhubErrorHandler(err, req, res, next) {
  if (!err) return next();

  // 1. Report unhandled error to TaskHub (non-blocking)
  const statusCode = err.status || err.statusCode || 500;
  reportErrorToTaskHub(err, req, {
    statusCode,
    severity: statusCode >= 500 ? 'error' : 'warning',
    errorCode: err.code || 'INTERNAL_SERVER_ERROR'
  });

  // 2. If headers already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  // 3. For integration routes or general API routes, send a sanitized JSON response
  console.error(`[Unhandled Error] ${req.method} ${req.originalUrl || req.url}:`, err.message);

  const isIntegrationRoute = req.originalUrl && req.originalUrl.includes('/api/integration/');
  if (isIntegrationRoute) {
    const { sendError } = require('./integrationResponse');
    return sendError(
      res,
      statusCode,
      err.code || 'INTERNAL_SERVER_ERROR',
      sanitizeErrorMessage(err.message),
      { req, retryable: statusCode >= 500 }
    );
  }

  return res.status(statusCode).json({
    error: 'Internal Server Error',
    message: statusCode >= 500 ? 'An unexpected server error occurred.' : sanitizeErrorMessage(err.message)
  });
}

module.exports = {
  reportErrorToTaskHub,
  taskhubErrorHandler,
  sanitizeErrorMessage,
  sanitizeObject,
  _getErrorQueue: () => errorQueue // Exported for isolated test verification
};
