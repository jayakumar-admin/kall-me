const express = require('express');
const db = require('../../db');
const { createIntegrationAuth } = require('../../middleware/integrationAuth');
const { sendSuccess, sendError } = require('../../utils/integrationResponse');
const {
  runHealthCheck,
  getDashboardStats
} = require('../../utils/backupService');
const { getSchedulerStatus } = require('../../utils/backupScheduler');
const { collectMetrics } = require('../../services/metricsService');
const { getAggregatedTraffic } = require('../../services/trafficMetricsService');
const { getCurrentDeployment, getDeploymentHistory } = require('../../services/deploymentService');

const router = express.Router();

/**
 * Validates integer query parameter
 */
function parsePositiveInt(val, paramName, defaultValue = null) {
  if (val === undefined || val === null || val === '') return { value: defaultValue };
  const num = Number(val);
  if (!Number.isInteger(num) || num < 0) {
    return { error: `Invalid parameter '${paramName}'. Must be a non-negative integer.` };
  }
  return { value: num };
}

/**
 * Validates and parses date strings (ISO or YYYY-MM-DD)
 */
function parseDate(val, paramName) {
  if (!val || typeof val !== 'string' || val.trim() === '') return { date: null };
  const trimmed = val.trim();
  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) {
    return { error: `Invalid date format for '${paramName}'. Expected ISO-8601 or YYYY-MM-DD format.` };
  }
  return { date: parsed };
}

/**
 * Normalize level string for unified log display
 */
function normalizeLogLevel(status, messageType = '') {
  const s = String(status || '').toLowerCase();
  const t = String(messageType || '').toLowerCase();

  if (s === 'failed' || s === 'error' || t.includes('fail') || t.includes('error')) return 'error';
  if (s === 'warning' || s === 'warn') return 'warn';
  if (s === 'sent' || s === 'success' || s === 'delivered') return 'info';
  return 'info';
}

// ============================================================================
// 1. HEALTH: GET /api/integration/v1/health
// ============================================================================
router.get('/health', createIntegrationAuth('health'), async (req, res) => {
  const startTime = Date.now();
  let dbStatus = 'healthy';
  let dbLatencyMs = 0;

  try {
    const t0 = Date.now();
    await db.query('SELECT 1');
    dbLatencyMs = Date.now() - t0;
  } catch (err) {
    dbStatus = 'unhealthy';
    console.error('[Integration Health] DB ping failure:', err.message);
  }

  const allowedResourcesSetting =
    process.env.TASKHUB_INTEGRATION_ALLOWED_RESOURCES ||
    'health,metrics,logs,traffic,deployments,inventory,billing,backups,diagnostics';

  let scheduler = null;
  try {
    scheduler = getSchedulerStatus();
  } catch (schedErr) {
    // Ignore scheduler error
  }

  const pool = db.pool;

  const healthData = {
    status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
    version: '1.0.0',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    latencyMs: Date.now() - startTime,
    components: {
      database: {
        engine: 'PostgreSQL',
        status: dbStatus,
        latencyMs: dbLatencyMs,
        connectionPool: {
          total: pool?.totalCount ?? null,
          idle: pool?.idleCount ?? null,
          waiting: pool?.waitingCount ?? null
        }
      },
      integration: {
        status: 'active',
        keyId: req.integration?.keyId || 'kallme-default',
        allowedResources: allowedResourcesSetting.split(',').map((r) => r.trim())
      },
      process: {
        nodeVersion: process.version,
        memoryUsage: process.memoryUsage(),
        pid: process.pid
      },
      backgroundJobs: {
        schedulerRunning: scheduler?.isRunning ?? false,
        frequency: scheduler?.frequency ?? 'twice_weekly'
      }
    }
  };

  const statusCode = dbStatus === 'healthy' ? 200 : 503;
  return sendSuccess(res, healthData, { req, resource: 'health' }, statusCode);
});

// ============================================================================
// 2. METRICS: GET /api/integration/v1/metrics
// ============================================================================
router.get('/metrics', createIntegrationAuth('metrics'), async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const metricsData = await collectMetrics(forceRefresh);
    const statusCode = metricsData.application?.status === 'unhealthy' ? 503 : 200;
    return sendSuccess(res, metricsData, { req, resource: 'metrics' }, statusCode);
  } catch (err) {
    console.error('[Integration Metrics] Error:', err.message);
    return sendError(
      res,
      500,
      'METRICS_COLLECTION_FAILED',
      'Failed to collect application runtime measurements.',
      { req, retryable: true }
    );
  }
});

// ============================================================================
// 3. TRAFFIC: GET /api/integration/v1/traffic
// ============================================================================
router.get('/traffic', createIntegrationAuth('traffic'), async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      date,
      window = '1m',
      route,
      method,
      status,
      page: pageRaw,
      limit: limitRaw
    } = req.query;

    const pageParsed = parsePositiveInt(pageRaw, 'page', 1);
    if (pageParsed.error) {
      return sendError(res, 400, 'INVALID_QUERY_PARAMETER', pageParsed.error, { req });
    }
    const page = Math.max(1, pageParsed.value);

    const limitParsed = parsePositiveInt(limitRaw, 'limit', 50);
    if (limitParsed.error) {
      return sendError(res, 400, 'INVALID_QUERY_PARAMETER', limitParsed.error, { req });
    }
    const limit = Math.min(Math.max(1, limitParsed.value), 100);

    // Date range validation
    let startBoundary = null;
    let endBoundary = null;

    if (date) {
      const dParsed = parseDate(date, 'date');
      if (dParsed.error) {
        return sendError(res, 400, 'INVALID_DATE_FORMAT', dParsed.error, { req });
      }
      startBoundary = new Date(dParsed.date);
      startBoundary.setHours(0, 0, 0, 0);
      endBoundary = new Date(dParsed.date);
      endBoundary.setHours(23, 59, 59, 999);
    } else {
      if (startDate) {
        const sParsed = parseDate(startDate, 'startDate');
        if (sParsed.error) {
          return sendError(res, 400, 'INVALID_DATE_FORMAT', sParsed.error, { req });
        }
        startBoundary = sParsed.date;
      }
      if (endDate) {
        const eParsed = parseDate(endDate, 'endDate');
        if (eParsed.error) {
          return sendError(res, 400, 'INVALID_DATE_FORMAT', eParsed.error, { req });
        }
        endBoundary = eParsed.date;
      }
    }

    if (startBoundary && endBoundary && startBoundary > endBoundary) {
      return sendError(
        res,
        400,
        'INVALID_DATE_RANGE',
        "'startDate' must be before or equal to 'endDate'.",
        { req }
      );
    }

    const trafficResult = getAggregatedTraffic({
      startDate: startBoundary ? startBoundary.toISOString() : null,
      endDate: endBoundary ? endBoundary.toISOString() : null,
      window,
      route,
      method,
      status,
      page,
      limit
    });

    return sendSuccess(res, trafficResult.data, {
      req,
      resource: 'traffic',
      page: trafficResult.page,
      limit: trafficResult.limit,
      total: trafficResult.total,
      hasMore: trafficResult.hasMore,
      extraMeta: { summary: trafficResult.summary },
      extraFields: { summary: trafficResult.summary }
    });
  } catch (err) {
    console.error('[Integration Traffic] Error:', err.message);
    return sendError(
      res,
      500,
      'TRAFFIC_QUERY_FAILED',
      'Failed to retrieve traffic telemetry measurements.',
      { req, retryable: true }
    );
  }
});

// ============================================================================
// 4. DEPLOYMENTS: GET /api/integration/v1/deployments
// ============================================================================
router.get('/deployments', createIntegrationAuth('deployments'), async (req, res) => {
  try {
    const { page: pageRaw, limit: limitRaw } = req.query;

    const pageParsed = parsePositiveInt(pageRaw, 'page', 1);
    if (pageParsed.error) {
      return sendError(res, 400, 'INVALID_QUERY_PARAMETER', pageParsed.error, { req });
    }
    const page = Math.max(1, pageParsed.value);

    const limitParsed = parsePositiveInt(limitRaw, 'limit', 20);
    if (limitParsed.error) {
      return sendError(res, 400, 'INVALID_QUERY_PARAMETER', limitParsed.error, { req });
    }
    const limit = Math.min(Math.max(1, limitParsed.value), 100);

    const result = getDeploymentHistory({ page, limit });

    return sendSuccess(res, result.deployments, {
      req,
      resource: 'deployments',
      page: result.page,
      limit: result.limit,
      total: result.total,
      hasMore: result.hasMore,
      extraMeta: { current: result.current },
      extraFields: { current: result.current }
    });
  } catch (err) {
    console.error('[Integration Deployments] Error:', err.message);
    return sendError(
      res,
      500,
      'DEPLOYMENT_QUERY_FAILED',
      'Failed to retrieve deployment status records.',
      { req, retryable: true }
    );
  }
});

// ============================================================================
// 5. RESTRICTED READ-ONLY DIAGNOSTICS: GET /api/integration/v1/diagnostics
// ============================================================================
router.get('/diagnostics', createIntegrationAuth('diagnostics'), async (req, res) => {
  try {
    const { check = 'all', operation } = req.query;
    const requestedCheck = (operation || check || 'all').toLowerCase().trim();

    const allowedChecks = ['all', 'health', 'process', 'database', 'storage', 'recent_errors', 'deployment'];
    if (!allowedChecks.includes(requestedCheck)) {
      return sendError(
        res,
        400,
        'INVALID_DIAGNOSTIC_OPERATION',
        `Unsupported diagnostic operation '${requestedCheck}'. Arbitrary shell command execution is prohibited. Allowed operations: ${allowedChecks.join(', ')}`,
        { req }
      );
    }

    const results = {};
    const timestamp = new Date().toISOString();

    if (requestedCheck === 'all' || requestedCheck === 'health' || requestedCheck === 'database') {
      try {
        const t0 = Date.now();
        await db.query('SELECT 1');
        results.database = {
          status: 'pass',
          latencyMs: Date.now() - t0,
          connectionPool: {
            total: db.pool?.totalCount ?? null,
            idle: db.pool?.idleCount ?? null,
            waiting: db.pool?.waitingCount ?? null
          }
        };
      } catch (dbErr) {
        results.database = { status: 'fail', error: dbErr.message };
      }
    }

    if (requestedCheck === 'all' || requestedCheck === 'process') {
      results.process = {
        status: 'pass',
        uptimeSeconds: Math.floor(process.uptime()),
        pid: process.pid,
        nodeVersion: process.version,
        memoryUsageMb: {
          rss: Math.round(process.memoryUsage().rss / (1024 * 1024)),
          heapUsed: Math.round(process.memoryUsage().heapUsed / (1024 * 1024))
        }
      };
    }

    if (requestedCheck === 'all' || requestedCheck === 'storage') {
      try {
        const { getDiskMetrics } = require('../../services/metricsService');
        const disk = getDiskMetrics();
        results.storage = {
          status: disk.available ? 'pass' : 'restricted',
          diskUsage: disk
        };
      } catch (storageErr) {
        results.storage = { status: 'restricted', error: storageErr.message };
      }
    }

    if (requestedCheck === 'all' || requestedCheck === 'recent_errors') {
      try {
        const errQuery = `
          SELECT COUNT(*) AS count
          FROM backup_audit_logs
          WHERE status IN ('failed', 'error')
            AND created_at >= NOW() - INTERVAL '15 minutes'
        `;
        const countRes = await db.query(errQuery);
        results.recentErrors = {
          status: 'pass',
          errorsLast15Minutes: parseInt(countRes.rows[0]?.count || 0, 10)
        };
      } catch (errErr) {
        results.recentErrors = { status: 'warn', error: errErr.message };
      }
    }

    if (requestedCheck === 'all' || requestedCheck === 'deployment') {
      results.deployment = {
        status: 'pass',
        current: getCurrentDeployment()
      };
    }

    const hasFailure = Object.values(results).some((r) => r.status === 'fail');

    return sendSuccess(
      res,
      {
        diagnosticStatus: hasFailure ? 'degraded' : 'healthy',
        executedAt: timestamp,
        checks: results,
        securityPolicy: 'Restricted read-only diagnostics. Shell access is explicitly forbidden.'
      },
      { req, resource: 'diagnostics' },
      hasFailure ? 503 : 200
    );
  } catch (err) {
    console.error('[Integration Diagnostics] Error:', err.message);
    return sendError(
      res,
      500,
      'DIAGNOSTIC_EXECUTION_FAILED',
      'Failed to execute system diagnostics.',
      { req, retryable: true }
    );
  }
});

// ============================================================================
// 2. LOGS: GET /api/integration/v1/logs
// ============================================================================
router.get('/logs', createIntegrationAuth('logs'), async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      date,
      level,
      service = 'all',
      module: moduleParam,
      search,
      q,
      page: pageRaw,
      limit: limitRaw
    } = req.query;

    // Parameter validation
    const pageParsed = parsePositiveInt(pageRaw, 'page', 1);
    if (pageParsed.error) {
      return sendError(res, 400, 'INVALID_QUERY_PARAMETER', pageParsed.error, { req });
    }
    const page = Math.max(1, pageParsed.value);

    const limitParsed = parsePositiveInt(limitRaw, 'limit', 50);
    if (limitParsed.error) {
      return sendError(res, 400, 'INVALID_QUERY_PARAMETER', limitParsed.error, { req });
    }
    const limit = Math.min(Math.max(1, limitParsed.value), 100);
    const offset = (page - 1) * limit;

    // Date range validation
    let startBoundary = null;
    let endBoundary = null;

    if (date) {
      const dParsed = parseDate(date, 'date');
      if (dParsed.error) {
        return sendError(res, 400, 'INVALID_DATE_FORMAT', dParsed.error, { req });
      }
      startBoundary = new Date(dParsed.date);
      startBoundary.setHours(0, 0, 0, 0);
      endBoundary = new Date(dParsed.date);
      endBoundary.setHours(23, 59, 59, 999);
    } else {
      if (startDate) {
        const sParsed = parseDate(startDate, 'startDate');
        if (sParsed.error) {
          return sendError(res, 400, 'INVALID_DATE_FORMAT', sParsed.error, { req });
        }
        startBoundary = sParsed.date;
        if (/^\d{4}-\d{2}-\d{2}$/.test(String(startDate).trim())) {
          startBoundary.setHours(0, 0, 0, 0);
        }
      }
      if (endDate) {
        const eParsed = parseDate(endDate, 'endDate');
        if (eParsed.error) {
          return sendError(res, 400, 'INVALID_DATE_FORMAT', eParsed.error, { req });
        }
        endBoundary = eParsed.date;
        if (/^\d{4}-\d{2}-\d{2}$/.test(String(endDate).trim())) {
          endBoundary.setHours(23, 59, 59, 999);
        }
      }
    }

    if (startBoundary && endBoundary && startBoundary > endBoundary) {
      return sendError(
        res,
        400,
        'INVALID_DATE_RANGE',
        "'startDate' must be before or equal to 'endDate'.",
        { req }
      );
    }

    // Query selection based on service/module filter ('whatsapp', 'backup', or 'all')
    let serviceFilter = String(service || moduleParam || 'all').toLowerCase();
    if (serviceFilter.includes('whatsapp')) serviceFilter = 'whatsapp';
    else if (serviceFilter.includes('backup')) serviceFilter = 'backup';
    else if (serviceFilter === 'all' || serviceFilter === 'all modules') serviceFilter = 'all';

    const queryParams = [];
    const baseConditions = [];

    if (startBoundary) {
      queryParams.push(startBoundary.toISOString());
      baseConditions.push(`created_at >= $${queryParams.length}`);
    }
    if (endBoundary) {
      queryParams.push(endBoundary.toISOString());
      baseConditions.push(`created_at <= $${queryParams.length}`);
    }

    // Support search query across text fields
    const searchQuery = String(search || q || '').trim().toLowerCase();
    let searchParamIdx = null;
    if (searchQuery) {
      queryParams.push(`%${searchQuery}%`);
      searchParamIdx = queryParams.length;
    }

    const waConditions = [...baseConditions];
    const bakConditions = [...baseConditions];

    if (searchParamIdx) {
      waConditions.push(`(LOWER(message_content) LIKE $${searchParamIdx} OR LOWER(recipient_number) LIKE $${searchParamIdx} OR CAST(order_id AS TEXT) LIKE $${searchParamIdx} OR LOWER(COALESCE(reason, '')) LIKE $${searchParamIdx})`);
      bakConditions.push(`(LOWER(action) LIKE $${searchParamIdx} OR LOWER(operator) LIKE $${searchParamIdx} OR CAST(details AS TEXT) LIKE $${searchParamIdx})`);
    }

    const waWhere = waConditions.length > 0 ? `WHERE ${waConditions.join(' AND ')}` : '';
    const bakWhere = bakConditions.length > 0 ? `WHERE ${bakConditions.join(' AND ')}` : '';

    let unionQuery = '';
    let countQuery = '';

    if (serviceFilter === 'whatsapp') {
      countQuery = `SELECT COUNT(*) FROM whatsapp_logs ${waWhere}`;
      unionQuery = `
        SELECT 
          id,
          'whatsapp' AS service,
          status,
          message_type,
          message_content AS message,
          json_build_object(
            'recipientNumber', recipient_number,
            'reason', reason,
            'orderId', order_id,
            'userId', user_id,
            'messageType', message_type
          ) AS details,
          created_at
        FROM whatsapp_logs
        ${waWhere}
      `;
    } else if (serviceFilter === 'backup' || serviceFilter === 'backup_audit') {
      countQuery = `SELECT COUNT(*) FROM backup_audit_logs ${bakWhere}`;
      unionQuery = `
        SELECT 
          id,
          'backup' AS service,
          status,
          action AS message_type,
          action AS message,
          json_build_object(
            'operator', operator,
            'action', action,
            'details', details
          ) AS details,
          created_at
        FROM backup_audit_logs
        ${bakWhere}
      `;
    } else {
      // Default: Unified view of application logs from whatsapp_logs and backup_audit_logs
      countQuery = `
        SELECT (
          (SELECT COUNT(*) FROM whatsapp_logs ${waWhere}) +
          (SELECT COUNT(*) FROM backup_audit_logs ${bakWhere})
        ) AS count
      `;
      unionQuery = `
        SELECT 
          id,
          'whatsapp' AS service,
          status,
          message_type,
          message_content AS message,
          json_build_object(
            'recipientNumber', recipient_number,
            'reason', reason,
            'orderId', order_id,
            'userId', user_id,
            'messageType', message_type
          ) AS details,
          created_at
        FROM whatsapp_logs
        ${waWhere}
        UNION ALL
        SELECT 
          id,
          'backup' AS service,
          status,
          action AS message_type,
          action AS message,
          json_build_object(
            'operator', operator,
            'action', action,
            'details', details
          ) AS details,
          created_at
        FROM backup_audit_logs
        ${bakWhere}
      `;
    }

    // Execute count query
    const countRes = await db.query(countQuery, queryParams);
    const total = parseInt(countRes.rows[0]?.count || 0, 10);

    // Apply level filter if provided in memory or wrapped query
    const listSql = `
      SELECT * FROM (${unionQuery}) AS combined_logs
      ORDER BY created_at DESC, id DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;

    const listRes = await db.query(listSql, [...queryParams, limit, offset]);

    // Format logs with normalized levels and masked numbers
    const formattedLogs = listRes.rows.map((row) => {
      const normalizedLevel = normalizeLogLevel(row.status, row.message_type);
      const isWhatsApp = row.service === 'whatsapp';

      // Mask sensitive phone numbers in WhatsApp logs for privacy
      const details = { ...row.details };
      if (details.recipientNumber && typeof details.recipientNumber === 'string') {
        const num = details.recipientNumber;
        details.recipientNumber = num.length > 5 ? `${num.slice(0, 3)}****${num.slice(-2)}` : '****';
      }

      const reqId = isWhatsApp
        ? (details.orderId ? `ORD-${details.orderId}` : `req_wa_${row.id}`)
        : (details.backupId ? `BAK-${details.backupId}` : `req_bak_${row.id}`);

      const moduleName = isWhatsApp ? 'WhatsApp Gateway' : 'Database Backup';
      const routeName = isWhatsApp ? '/api/whatsapp/send' : '/api/admin/backups';
      const contextName = isWhatsApp
        ? `WhatsApp / ${row.message_type || 'Notification'}`
        : `Database / ${row.message_type || 'Maintenance'}`;

      const actionName = isWhatsApp
        ? (row.message_type ? row.message_type.toUpperCase() : 'SEND_MESSAGE')
        : (row.message_type ? row.message_type.toUpperCase() : 'BACKUP_ACTION');

      return {
        id: `${row.service}-${row.id}`,
        timestamp: row.created_at,
        created_at: row.created_at,
        service: row.service,
        module: moduleName,
        level: normalizedLevel,
        status: row.status,
        requestId: reqId,
        request_id: reqId,
        route: routeName,
        context: contextName,
        action: actionName,
        message: row.message,
        error: normalizedLevel === 'error' ? row.message : null,
        details
      };
    });

    // Optional level filtering
    const finalLogs = level && String(level).toLowerCase() !== 'all levels'
      ? formattedLogs.filter((l) => l.level.toLowerCase() === String(level).toLowerCase())
      : formattedLogs;

    const hasMore = offset + listRes.rows.length < total;

    // Calculate metrics for TaskHub summary cards
    let metrics = {
      errorsToday: 0,
      warningsToday: 0,
      apiFailures: 0,
      paymentErrors: 0,
      orderErrors: 0,
      slowApis: 0
    };

    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayIso = todayStart.toISOString();

      const [waTodayRes, backupTodayRes, ordersRes] = await Promise.all([
        db.query(
          `SELECT 
             COUNT(*) FILTER (WHERE status IN ('failed', 'error')) AS errors,
             COUNT(*) FILTER (WHERE status IN ('warn', 'warning')) AS warnings
           FROM whatsapp_logs WHERE created_at >= $1`,
          [todayIso]
        ),
        db.query(
          `SELECT 
             COUNT(*) FILTER (WHERE status IN ('failed', 'error')) AS errors,
             COUNT(*) FILTER (WHERE status IN ('warn', 'warning')) AS warnings
           FROM backup_audit_logs WHERE created_at >= $1`,
          [todayIso]
        ),
        db.query(
          `SELECT 
             COUNT(*) FILTER (WHERE LOWER(status) IN ('payment_failed', 'failed')) AS payment_errors,
             COUNT(*) FILTER (WHERE LOWER(status) = 'cancelled') AS order_errors
           FROM orders WHERE created_at >= $1`,
          [todayIso]
        )
      ]);

      const waErrors = parseInt(waTodayRes.rows[0]?.errors || 0, 10);
      const waWarnings = parseInt(waTodayRes.rows[0]?.warnings || 0, 10);
      const bakErrors = parseInt(backupTodayRes.rows[0]?.errors || 0, 10);
      const bakWarnings = parseInt(backupTodayRes.rows[0]?.warnings || 0, 10);
      const paymentErrors = parseInt(ordersRes.rows[0]?.payment_errors || 0, 10);
      const orderErrors = parseInt(ordersRes.rows[0]?.order_errors || 0, 10);

      metrics = {
        errorsToday: waErrors + bakErrors,
        warningsToday: waWarnings + bakWarnings,
        apiFailures: waErrors + bakErrors,
        paymentErrors,
        orderErrors,
        slowApis: 0
      };
    } catch (metricErr) {
      console.warn('[Integration Logs] Failed to compute summary metrics:', metricErr.message);
    }

    return sendSuccess(res, finalLogs, {
      req,
      resource: 'logs',
      page,
      limit,
      total,
      hasMore,
      extraMeta: { metrics, summary: metrics },
      extraFields: { logs: finalLogs, metrics, summary: metrics }
    });
  } catch (err) {
    console.error('[Integration Logs] Query error:', err.message);
    return sendError(
      res,
      500,
      'DATABASE_QUERY_ERROR',
      'Failed to retrieve log records from the database.',
      { req, retryable: true }
    );
  }
});

// ============================================================================
// 3. INVENTORY: GET /api/integration/v1/inventory
// ============================================================================
router.get('/inventory', createIntegrationAuth('inventory'), async (req, res) => {
  try {
    const {
      hotel_id,
      category,
      search,
      page: pageRaw,
      limit: limitRaw
    } = req.query;

    const pageParsed = parsePositiveInt(pageRaw, 'page', 1);
    if (pageParsed.error) {
      return sendError(res, 400, 'INVALID_QUERY_PARAMETER', pageParsed.error, { req });
    }
    const page = Math.max(1, pageParsed.value);

    const limitParsed = parsePositiveInt(limitRaw, 'limit', 50);
    if (limitParsed.error) {
      return sendError(res, 400, 'INVALID_QUERY_PARAMETER', limitParsed.error, { req });
    }
    const limit = Math.min(Math.max(1, limitParsed.value), 100);
    const offset = (page - 1) * limit;

    const params = [];
    const conditions = [];

    if (hotel_id !== undefined && hotel_id !== '') {
      const hotelIdParsed = parsePositiveInt(hotel_id, 'hotel_id');
      if (hotelIdParsed.error) {
        return sendError(res, 400, 'INVALID_QUERY_PARAMETER', hotelIdParsed.error, { req });
      }
      params.push(hotelIdParsed.value);
      conditions.push(`m.hotel_id = $${params.length}`);
    }

    if (category && String(category).trim() !== '') {
      params.push(String(category).trim().toLowerCase());
      conditions.push(`LOWER(m.category) = $${params.length}`);
    }

    if (search && String(search).trim() !== '') {
      params.push(`%${String(search).trim().toLowerCase()}%`);
      conditions.push(`(LOWER(m.name) LIKE $${params.length} OR LOWER(COALESCE(m.description, '')) LIKE $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query
    const countSql = `
      SELECT COUNT(*) AS count
      FROM menus m
      LEFT JOIN hotels h ON m.hotel_id = h.id
      ${whereClause}
    `;
    const countRes = await db.query(countSql, params);
    const total = parseInt(countRes.rows[0]?.count || 0, 10);

    // List query
    const listSql = `
      SELECT 
        m.id,
        m.name,
        m.description,
        m.price,
        m.category,
        m.image_url,
        m.hotel_id,
        h.name AS hotel_name,
        h.category AS hotel_category,
        h.status AS hotel_status
      FROM menus m
      LEFT JOIN hotels h ON m.hotel_id = h.id
      ${whereClause}
      ORDER BY m.id ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const listRes = await db.query(listSql, [...params, limit, offset]);
    const hasMore = offset + listRes.rows.length < total;

    return sendSuccess(res, listRes.rows, {
      req,
      resource: 'inventory',
      page,
      limit,
      total,
      hasMore
    });
  } catch (err) {
    console.error('[Integration Inventory] Query error:', err.message);
    return sendError(
      res,
      500,
      'DATABASE_QUERY_ERROR',
      'Failed to retrieve inventory records from the database.',
      { req, retryable: true }
    );
  }
});

// ============================================================================
// 4. BILLING: GET /api/integration/v1/billing
// ============================================================================
router.get('/billing', createIntegrationAuth('billing'), async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      date,
      hotel_id,
      status,
      page: pageRaw,
      limit: limitRaw
    } = req.query;

    const pageParsed = parsePositiveInt(pageRaw, 'page', 1);
    if (pageParsed.error) {
      return sendError(res, 400, 'INVALID_QUERY_PARAMETER', pageParsed.error, { req });
    }
    const page = Math.max(1, pageParsed.value);

    const limitParsed = parsePositiveInt(limitRaw, 'limit', 50);
    if (limitParsed.error) {
      return sendError(res, 400, 'INVALID_QUERY_PARAMETER', limitParsed.error, { req });
    }
    const limit = Math.min(Math.max(1, limitParsed.value), 100);
    const offset = (page - 1) * limit;

    // Date range validation
    let startBoundary = null;
    let endBoundary = null;

    if (date) {
      const dParsed = parseDate(date, 'date');
      if (dParsed.error) {
        return sendError(res, 400, 'INVALID_DATE_FORMAT', dParsed.error, { req });
      }
      startBoundary = new Date(dParsed.date);
      startBoundary.setHours(0, 0, 0, 0);
      endBoundary = new Date(dParsed.date);
      endBoundary.setHours(23, 59, 59, 999);
    } else {
      if (startDate) {
        const sParsed = parseDate(startDate, 'startDate');
        if (sParsed.error) {
          return sendError(res, 400, 'INVALID_DATE_FORMAT', sParsed.error, { req });
        }
        startBoundary = sParsed.date;
      }
      if (endDate) {
        const eParsed = parseDate(endDate, 'endDate');
        if (eParsed.error) {
          return sendError(res, 400, 'INVALID_DATE_FORMAT', eParsed.error, { req });
        }
        endBoundary = eParsed.date;
      }
    }

    if (startBoundary && endBoundary && startBoundary > endBoundary) {
      return sendError(
        res,
        400,
        'INVALID_DATE_RANGE',
        "'startDate' must be before or equal to 'endDate'.",
        { req }
      );
    }

    const params = [];
    const conditions = [];

    if (startBoundary) {
      params.push(startBoundary.toISOString());
      conditions.push(`o.created_at >= $${params.length}`);
    }
    if (endBoundary) {
      params.push(endBoundary.toISOString());
      conditions.push(`o.created_at <= $${params.length}`);
    }

    if (hotel_id !== undefined && hotel_id !== '') {
      const hotelIdParsed = parsePositiveInt(hotel_id, 'hotel_id');
      if (hotelIdParsed.error) {
        return sendError(res, 400, 'INVALID_QUERY_PARAMETER', hotelIdParsed.error, { req });
      }
      params.push(hotelIdParsed.value);
      conditions.push(`o.hotel_id = $${params.length}`);
    }

    if (status && String(status).trim() !== '') {
      params.push(String(status).trim().toLowerCase());
      conditions.push(`LOWER(o.status) = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query
    const countSql = `SELECT COUNT(*) AS count FROM orders o ${whereClause}`;
    const countRes = await db.query(countSql, params);
    const total = parseInt(countRes.rows[0]?.count || 0, 10);

    // List query
    const listSql = `
      SELECT 
        o.id,
        o.order_number,
        o.hotel_id,
        o.hotel_name,
        o.customer_name,
        o.customer_type,
        o.subtotal,
        o.shipping_fee,
        o.delivery_charge,
        o.admin_commission_amount,
        o.commission_percentage_applied,
        o.commission_calculation_type,
        o.shipping_calculation_type,
        o.grand_total,
        o.gst_amount,
        o.igst_amount,
        o.amount_received,
        o.balance_pending,
        o.status,
        o.created_at
      FROM orders o
      ${whereClause}
      ORDER BY o.created_at DESC, o.id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const listRes = await db.query(listSql, [...params, limit, offset]);
    const hasMore = offset + listRes.rows.length < total;

    return sendSuccess(res, listRes.rows, {
      req,
      resource: 'billing',
      page,
      limit,
      total,
      hasMore
    });
  } catch (err) {
    console.error('[Integration Billing] Query error:', err.message);
    return sendError(
      res,
      500,
      'DATABASE_QUERY_ERROR',
      'Failed to retrieve billing records from the database.',
      { req, retryable: true }
    );
  }
});

// ============================================================================
// 5. BACKUPS HEALTH: GET /api/integration/v1/backups/health
// ============================================================================
router.get('/backups/health', createIntegrationAuth('backups'), async (req, res) => {
  try {
    // Reuses the established application health check and scheduler status
    const report = await runHealthCheck();
    const scheduler = getSchedulerStatus();
    let stats = null;

    try {
      stats = await getDashboardStats();
    } catch (statsErr) {
      console.warn('[Integration Backups Health] Failed getting dashboard stats:', statsErr.message);
    }

    const backupHealthData = {
      status: report.healthRating === 'Healthy' ? 'healthy' : 'warning',
      overallStatus: report.overallStatus,
      healthRating: report.healthRating,
      checkedAt: report.checkedAt,
      durationMs: report.durationMs,
      checks: {
        database: report.checks?.databaseConnection || { status: 'healthy' },
        storageVault: report.checks?.storageVault || { status: 'healthy' },
        scheduler: scheduler || { isRunning: true }
      },
      entityCounts: report.entityCounts || {},
      referentialIntegrity: report.referentialIntegrity || [],
      dashboardSummary: stats
        ? {
            totalBackups: stats.totalBackups,
            storageUsedFormatted: stats.storageUsed?.formatted,
            systemHealth: stats.systemHealth
          }
        : null
    };

    return sendSuccess(res, backupHealthData, { req, resource: 'backups' });
  } catch (err) {
    console.error('[Integration Backups Health] Execution error:', err.message);
    return sendError(
      res,
      500,
      'HEALTH_CHECK_FAILED',
      'Failed to execute database backup and recovery health check.',
      { req, retryable: true }
    );
  }
});

// ============================================================================
// 6. BACKUPS HISTORY: GET /api/integration/v1/backups/history
// ============================================================================
router.get('/backups/history', createIntegrationAuth('backups'), async (req, res) => {
  try {
    const {
      status,
      type,
      startDate,
      endDate,
      date,
      page: pageRaw,
      limit: limitRaw
    } = req.query;

    const pageParsed = parsePositiveInt(pageRaw, 'page', 1);
    if (pageParsed.error) {
      return sendError(res, 400, 'INVALID_QUERY_PARAMETER', pageParsed.error, { req });
    }
    const page = Math.max(1, pageParsed.value);

    const limitParsed = parsePositiveInt(limitRaw, 'limit', 50);
    if (limitParsed.error) {
      return sendError(res, 400, 'INVALID_QUERY_PARAMETER', limitParsed.error, { req });
    }
    const limit = Math.min(Math.max(1, limitParsed.value), 100);
    const offset = (page - 1) * limit;

    // Date range validation
    let startBoundary = null;
    let endBoundary = null;

    if (date) {
      const dParsed = parseDate(date, 'date');
      if (dParsed.error) {
        return sendError(res, 400, 'INVALID_DATE_FORMAT', dParsed.error, { req });
      }
      startBoundary = new Date(dParsed.date);
      startBoundary.setHours(0, 0, 0, 0);
      endBoundary = new Date(dParsed.date);
      endBoundary.setHours(23, 59, 59, 999);
    } else {
      if (startDate) {
        const sParsed = parseDate(startDate, 'startDate');
        if (sParsed.error) {
          return sendError(res, 400, 'INVALID_DATE_FORMAT', sParsed.error, { req });
        }
        startBoundary = sParsed.date;
      }
      if (endDate) {
        const eParsed = parseDate(endDate, 'endDate');
        if (eParsed.error) {
          return sendError(res, 400, 'INVALID_DATE_FORMAT', eParsed.error, { req });
        }
        endBoundary = eParsed.date;
      }
    }

    if (startBoundary && endBoundary && startBoundary > endBoundary) {
      return sendError(
        res,
        400,
        'INVALID_DATE_RANGE',
        "'startDate' must be before or equal to 'endDate'.",
        { req }
      );
    }

    const params = [];
    const conditions = [];

    if (status && String(status).trim() !== '') {
      params.push(String(status).trim().toLowerCase());
      conditions.push(`LOWER(status) = $${params.length}`);
    }

    if (type && String(type).trim() !== '') {
      params.push(String(type).trim().toLowerCase());
      conditions.push(`LOWER(backup_type) = $${params.length}`);
    }

    if (startBoundary) {
      params.push(startBoundary.toISOString());
      conditions.push(`created_at >= $${params.length}`);
    }
    if (endBoundary) {
      params.push(endBoundary.toISOString());
      conditions.push(`created_at <= $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query
    const countSql = `SELECT COUNT(*) AS count FROM backup_metadata ${whereClause}`;
    const countRes = await db.query(countSql, params);
    const total = parseInt(countRes.rows[0]?.count || 0, 10);

    // List query
    const listSql = `
      SELECT 
        id,
        backup_name,
        storage_path,
        backup_type,
        status,
        backup_size_bytes,
        duration_ms,
        table_count,
        sha256_checksum,
        format_version,
        verification_status,
        verified_at,
        restore_status,
        restored_at,
        error_message,
        created_by,
        created_at
      FROM backup_metadata
      ${whereClause}
      ORDER BY created_at DESC, id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const listRes = await db.query(listSql, [...params, limit, offset]);
    const hasMore = offset + listRes.rows.length < total;

    return sendSuccess(res, listRes.rows, {
      req,
      resource: 'backups',
      page,
      limit,
      total,
      hasMore
    });
  } catch (err) {
    console.error('[Integration Backups History] Query error:', err.message);
    return sendError(
      res,
      500,
      'DATABASE_QUERY_ERROR',
      'Failed to retrieve backup history records from the database.',
      { req, retryable: true }
    );
  }
});

module.exports = router;
