const crypto = require('crypto');

/**
 * Normalizes configuration values
 */
function getApplicationId() {
  return process.env.TASKHUB_APPLICATION_ID || 'kall-me';
}

function getEnvironment() {
  return process.env.TASKHUB_ENVIRONMENT || process.env.NODE_ENV || 'production';
}

/**
 * Extracts or generates a correlation ID for request tracing
 */
function getRequestId(req) {
  if (req && req.headers && req.headers['x-request-id']) {
    return String(req.headers['x-request-id']).trim();
  }
  if (req && req.id) {
    return String(req.id);
  }
  return crypto.randomUUID();
}

/**
 * Build standard success envelope
 */
function buildSuccessEnvelope(data, options = {}) {
  const {
    req,
    resource = 'general',
    page = null,
    limit = null,
    total = null,
    hasMore = false,
    nextCursor = null,
    extraMeta = {},
    extraFields = {}
  } = options;

  const meta = {
    applicationId: getApplicationId(),
    environment: getEnvironment(),
    resource,
    requestId: getRequestId(req),
    timestamp: new Date().toISOString()
  };

  if (page !== null && page !== undefined) {
    meta.page = Number(page);
  }
  if (limit !== null && limit !== undefined) {
    meta.limit = Number(limit);
  }
  if (total !== null && total !== undefined) {
    meta.total = Number(total);
  } else if (page !== null) {
    meta.total = null;
  }
  if (page !== null || limit !== null) {
    meta.hasMore = Boolean(hasMore);
    meta.nextCursor = nextCursor !== undefined ? nextCursor : null;
  }

  // Merge any safe extra metadata without overriding core fields
  Object.assign(meta, extraMeta);

  return {
    success: true,
    data: data !== undefined ? data : [],
    meta,
    error: null,
    ...extraFields
  };
}

/**
 * Build standard error envelope
 */
function buildErrorEnvelope(code, message, options = {}) {
  const {
    req,
    retryable = false,
    details = null,
    extraMeta = {}
  } = options;

  const meta = {
    applicationId: getApplicationId(),
    environment: getEnvironment(),
    requestId: getRequestId(req),
    timestamp: new Date().toISOString(),
    ...extraMeta
  };

  const errorObj = {
    code: code || 'INTEGRATION_REQUEST_FAILED',
    message: message || 'An error occurred while processing the integration request',
    retryable: Boolean(retryable)
  };

  if (details && typeof details === 'object' && !Array.isArray(details)) {
    // Only include sanitized, safe details (never passwords, keys, or stack traces)
    const sanitizedDetails = {};
    for (const [k, v] of Object.entries(details)) {
      if (!/password|token|secret|key|authorization/i.test(k)) {
        sanitizedDetails[k] = v;
      }
    }
    if (Object.keys(sanitizedDetails).length > 0) {
      errorObj.details = sanitizedDetails;
    }
  }

  return {
    success: false,
    data: null,
    meta,
    error: errorObj
  };
}

/**
 * Helper to send successful HTTP response
 */
function sendSuccess(res, data, options = {}, statusCode = 200) {
  const envelope = buildSuccessEnvelope(data, options);
  return res.status(statusCode).json(envelope);
}

/**
 * Helper to send error HTTP response
 */
function sendError(res, statusCode, code, message, options = {}) {
  const envelope = buildErrorEnvelope(code, message, options);
  return res.status(statusCode).json(envelope);
}

module.exports = {
  getApplicationId,
  getEnvironment,
  getRequestId,
  buildSuccessEnvelope,
  buildErrorEnvelope,
  sendSuccess,
  sendError
};
