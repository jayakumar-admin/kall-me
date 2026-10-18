/**
 * Kall Me - TaskHub Observability Integration: Traffic Metrics Service
 *
 * Lightweight, in-memory, sliding-window HTTP traffic instrumentation service.
 * Records route latency, status codes, error classifications, and request counts
 * aggregated by time window without logging sensitive payloads or headers.
 *
 * Design constraints:
 * - Minimal memory footprint via sliding time buckets and bounded history.
 * - Prevents recursive monitoring loops by ignoring integration endpoints.
 * - Distinguishes backend API traffic from web analytics (no fabricated pageviews/sessions).
 */

const crypto = require('crypto');

// Configuration constants
const BUCKET_WINDOW_MS = 60 * 1000; // 1-minute aggregation buckets
const MAX_BUCKETS_RETENTION = 24 * 60; // Retain up to 24 hours (1440 1-minute buckets)
const MAX_RECENT_REQUESTS = 500; // Bounded ring-buffer for recent sample inspection

// In-memory time buckets: Map<timestampMs, BucketData>
const trafficBuckets = new Map();

// Ring-buffer for recent requests
const recentRequestsRing = [];

// Clean up old buckets periodically (every 10 minutes)
setInterval(() => {
  const cutoff = Date.now() - MAX_BUCKETS_RETENTION * BUCKET_WINDOW_MS;
  for (const [bucketTimestamp] of trafficBuckets.entries()) {
    if (bucketTimestamp < cutoff) {
      trafficBuckets.delete(bucketTimestamp);
    }
  }
}, 10 * 60 * 1000).unref?.();

/**
 * Normalizes an Express route path to prevent high-cardinality unbounded keys.
 * Replaces UUIDs, numeric IDs, and query strings with ':id'.
 */
function normalizeRoutePath(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') return '/';
  
  // Strip query string if present
  let clean = rawPath.split('?')[0].trim();
  if (!clean.startsWith('/')) clean = '/' + clean;

  // Replace standard UUIDs: /orders/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11 -> /orders/:id
  clean = clean.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id');

  // Replace numeric IDs: /orders/12345 -> /orders/:id
  clean = clean.replace(/\/\d+(?=\/|$)/g, '/:id');

  return clean || '/';
}

/**
 * Classifies an HTTP status code into standardized TaskHub error category
 */
function classifyStatusCode(statusCode) {
  if (statusCode >= 500) return 'server_error';
  if (statusCode >= 400) return 'client_error';
  return 'none';
}

/**
 * Helper to get or initialize an aggregation bucket for a given timestamp
 */
function getOrCreateBucket(timestampMs) {
  const bucketKey = Math.floor(timestampMs / BUCKET_WINDOW_MS) * BUCKET_WINDOW_MS;
  let bucket = trafficBuckets.get(bucketKey);

  if (!bucket) {
    bucket = {
      bucketStart: new Date(bucketKey).toISOString(),
      timestampMs: bucketKey,
      windowSeconds: BUCKET_WINDOW_MS / 1000,
      requestCount: 0,
      totalDurationMs: 0,
      minDurationMs: Infinity,
      maxDurationMs: 0,
      durations: [],
      statusCodes: {},
      statusGroups: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 },
      errorClasses: { none: 0, client_error: 0, server_error: 0 },
      routes: {},
      methods: {},
      totalResponseBytes: 0,
      bytesSamplesCount: 0
    };
    trafficBuckets.set(bucketKey, bucket);
  }

  return bucket;
}

/**
 * Calculate percentile from sorted numeric array
 */
function calculatePercentile(sortedValues, percentile) {
  if (!sortedValues || sortedValues.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
}

/**
 * Records an HTTP request measurement in memory
 */
function recordRequestMeasurement({
  timestamp,
  method,
  route,
  statusCode,
  durationMs,
  responseBytes = null,
  requestId = null
}) {
  const now = timestamp ? new Date(timestamp).getTime() : Date.now();
  const bucket = getOrCreateBucket(now);

  bucket.requestCount += 1;
  bucket.totalDurationMs += durationMs;
  if (durationMs < bucket.minDurationMs) bucket.minDurationMs = durationMs;
  if (durationMs > bucket.maxDurationMs) bucket.maxDurationMs = durationMs;
  bucket.durations.push(durationMs);

  // Status codes
  const statusStr = String(statusCode);
  bucket.statusCodes[statusStr] = (bucket.statusCodes[statusStr] || 0) + 1;

  if (statusCode >= 200 && statusCode < 300) bucket.statusGroups['2xx'] += 1;
  else if (statusCode >= 300 && statusCode < 400) bucket.statusGroups['3xx'] += 1;
  else if (statusCode >= 400 && statusCode < 500) bucket.statusGroups['4xx'] += 1;
  else if (statusCode >= 500) bucket.statusGroups['5xx'] += 1;

  // Error classification
  const errorClass = classifyStatusCode(statusCode);
  bucket.errorClasses[errorClass] = (bucket.errorClasses[errorClass] || 0) + 1;

  // Route breakdown
  bucket.routes[route] = (bucket.routes[route] || 0) + 1;

  // Method breakdown
  bucket.methods[method] = (bucket.methods[method] || 0) + 1;

  // Bytes tracking
  if (responseBytes !== null && typeof responseBytes === 'number' && responseBytes >= 0) {
    bucket.totalResponseBytes += responseBytes;
    bucket.bytesSamplesCount += 1;
  }

  // Add to recent ring buffer
  recentRequestsRing.push({
    timestamp: new Date(now).toISOString(),
    method,
    route,
    statusCode,
    durationMs: Math.round(durationMs * 100) / 100,
    responseBytes,
    errorClass,
    requestId: requestId || crypto.randomUUID()
  });

  if (recentRequestsRing.length > MAX_RECENT_REQUESTS) {
    recentRequestsRing.shift();
  }
}

/**
 * Express Middleware to measure incoming HTTP traffic
 */
function trafficInstrumentationMiddleware(req, res, next) {
  // Exclude monitoring/integration routes from measuring themselves
  // This prevents recursive polling loops as mandated by Section 9
  const urlPath = req.originalUrl || req.url || '';
  if (
    urlPath.startsWith('/api/integration/v1') ||
    urlPath.startsWith('/api/admin/logs')
  ) {
    return next();
  }

  const startTimeHr = process.hrtime.bigint();
  const requestTimestamp = Date.now();

  res.on('finish', () => {
    try {
      const endTimeHr = process.hrtime.bigint();
      const durationMs = Number(endTimeHr - startTimeHr) / 1e6;

      // Extract template route or normalized path
      const base = req.baseUrl || '';
      const matchedPath = req.route?.path || req.path || '';
      const fullRoute = normalizeRoutePath(base + matchedPath);

      // Extract response bytes from header if available
      let responseBytes = null;
      const contentLength = res.getHeader('content-length');
      if (contentLength !== undefined && contentLength !== null) {
        const parsedBytes = parseInt(contentLength, 10);
        if (!isNaN(parsedBytes)) responseBytes = parsedBytes;
      }

      const correlationId =
        req.headers['x-request-id'] ||
        req.id ||
        null;

      recordRequestMeasurement({
        timestamp: requestTimestamp,
        method: req.method,
        route: fullRoute,
        statusCode: res.statusCode,
        durationMs,
        responseBytes,
        requestId: correlationId
      });
    } catch (err) {
      // Never allow telemetry errors to crash request handling
      console.warn('[Traffic Instrumentation] Failed recording measurement:', err.message);
    }
  });

  next();
}

/**
 * Retrieve aggregated traffic measurements for TaskHub integration API
 */
function getAggregatedTraffic(options = {}) {
  const {
    startDate = null,
    endDate = null,
    window = '1m', // '1m', '5m', '1h'
    route = null,
    method = null,
    status = null,
    page = 1,
    limit = 50
  } = options;

  const now = Date.now();
  let startMs = startDate ? new Date(startDate).getTime() : now - 60 * 60 * 1000; // Default last 1 hour
  let endMs = endDate ? new Date(endDate).getTime() : now;

  if (isNaN(startMs)) startMs = now - 60 * 60 * 1000;
  if (isNaN(endMs)) endMs = now;

  // Filter buckets within date range
  const matchingBuckets = [];
  for (const [timestampMs, bucket] of trafficBuckets.entries()) {
    if (timestampMs >= startMs && timestampMs <= endMs) {
      // Optional route or method filtering
      if (route && !bucket.routes[route]) continue;
      if (method && !bucket.methods[method.toUpperCase()]) continue;
      matchingBuckets.push(bucket);
    }
  }

  // Sort chronologically descending
  matchingBuckets.sort((a, b) => b.timestampMs - a.timestampMs);

  // Group by requested window size if window > 1m
  let windowMultiplier = 1;
  if (window === '5m') windowMultiplier = 5;
  else if (window === '15m') windowMultiplier = 15;
  else if (window === '1h') windowMultiplier = 60;

  let aggregatedList = [];

  if (windowMultiplier > 1) {
    const groupedMap = new Map();
    const groupDurationMs = windowMultiplier * BUCKET_WINDOW_MS;

    for (const b of matchingBuckets) {
      const groupKey = Math.floor(b.timestampMs / groupDurationMs) * groupDurationMs;
      let g = groupedMap.get(groupKey);
      if (!g) {
        g = {
          timestamp: new Date(groupKey).toISOString(),
          timestampMs: groupKey,
          windowSeconds: groupDurationMs / 1000,
          requestCount: 0,
          totalDurationMs: 0,
          minDurationMs: Infinity,
          maxDurationMs: 0,
          durations: [],
          statusCodes: {},
          statusGroups: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 },
          errorClasses: { none: 0, client_error: 0, server_error: 0 },
          routes: {},
          methods: {},
          totalResponseBytes: 0,
          bytesSamplesCount: 0
        };
        groupedMap.set(groupKey, g);
      }

      g.requestCount += b.requestCount;
      g.totalDurationMs += b.totalDurationMs;
      if (b.minDurationMs < g.minDurationMs) g.minDurationMs = b.minDurationMs;
      if (b.maxDurationMs > g.maxDurationMs) g.maxDurationMs = b.maxDurationMs;
      g.durations.push(...b.durations);

      for (const [code, count] of Object.entries(b.statusCodes)) {
        g.statusCodes[code] = (g.statusCodes[code] || 0) + count;
      }
      for (const [grp, count] of Object.entries(b.statusGroups)) {
        g.statusGroups[grp] += count;
      }
      for (const [cls, count] of Object.entries(b.errorClasses)) {
        g.errorClasses[cls] += count;
      }
      for (const [rt, count] of Object.entries(b.routes)) {
        g.routes[rt] = (g.routes[rt] || 0) + count;
      }
      for (const [mth, count] of Object.entries(b.methods)) {
        g.methods[mth] = (g.methods[mth] || 0) + count;
      }
      g.totalResponseBytes += b.totalResponseBytes;
      g.bytesSamplesCount += b.bytesSamplesCount;
    }

    aggregatedList = Array.from(groupedMap.values()).sort((a, b) => b.timestampMs - a.timestampMs);
  } else {
    aggregatedList = matchingBuckets.map((b) => ({
      timestamp: b.bucketStart,
      timestampMs: b.timestampMs,
      windowSeconds: b.windowSeconds,
      requestCount: b.requestCount,
      totalDurationMs: b.totalDurationMs,
      minDurationMs: b.minDurationMs === Infinity ? 0 : b.minDurationMs,
      maxDurationMs: b.maxDurationMs,
      durations: b.durations,
      statusCodes: b.statusCodes,
      statusGroups: b.statusGroups,
      errorClasses: b.errorClasses,
      routes: b.routes,
      methods: b.methods,
      totalResponseBytes: b.totalResponseBytes,
      bytesSamplesCount: b.bytesSamplesCount
    }));
  }

  // Format records with percentile latencies and averages
  const formattedRecords = aggregatedList.map((item) => {
    const sortedDurations = [...item.durations].sort((a, b) => a - b);
    const avgLatency = item.requestCount > 0 ? item.totalDurationMs / item.requestCount : 0;
    const totalErrors = item.statusGroups['4xx'] + item.statusGroups['5xx'];
    const errorRate = item.requestCount > 0 ? totalErrors / item.requestCount : 0;
    const avgBytes = item.bytesSamplesCount > 0 ? Math.round(item.totalResponseBytes / item.bytesSamplesCount) : null;

    return {
      timestamp: item.timestamp,
      windowSeconds: item.windowSeconds,
      requestCount: item.requestCount,
      requestsPerSecond: Math.round((item.requestCount / item.windowSeconds) * 100) / 100,
      durationMs: {
        min: item.minDurationMs === Infinity ? 0 : Math.round(item.minDurationMs * 10) / 10,
        max: Math.round(item.maxDurationMs * 10) / 10,
        average: Math.round(avgLatency * 10) / 10,
        p50: Math.round(calculatePercentile(sortedDurations, 50) * 10) / 10,
        p95: Math.round(calculatePercentile(sortedDurations, 95) * 10) / 10,
        p99: Math.round(calculatePercentile(sortedDurations, 99) * 10) / 10
      },
      statusDistribution: item.statusGroups,
      errorCount: totalErrors,
      errorRate: Math.round(errorRate * 1000) / 1000,
      errorClassification: item.errorClasses,
      responseBytes: {
        total: item.totalResponseBytes > 0 ? item.totalResponseBytes : null,
        average: avgBytes
      },
      topRoutes: Object.entries(item.routes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([routeTemplate, count]) => ({ route: routeTemplate, count })),
      methods: item.methods
    };
  });

  // Calculate high-level summary across the whole selected period
  let totalRequests = 0;
  let totalDurations = 0;
  let totalErrors = 0;
  let totalClientErrors = 0;
  let totalServerErrors = 0;
  let totalBytes = 0;
  const allDurations = [];

  for (const rec of formattedRecords) {
    totalRequests += rec.requestCount;
    totalErrors += rec.errorCount;
    totalClientErrors += rec.errorClassification.client_error || 0;
    totalServerErrors += rec.errorClassification.server_error || 0;
    if (rec.responseBytes.total) totalBytes += rec.responseBytes.total;
  }

  const timespanSeconds = Math.max(1, Math.floor((endMs - startMs) / 1000));
  const overallAvgLatency =
    formattedRecords.length > 0
      ? formattedRecords.reduce((acc, r) => acc + r.durationMs.average * r.requestCount, 0) /
        Math.max(1, totalRequests)
      : 0;

  const summary = {
    totalRequests,
    requestsPerSecond: Math.round((totalRequests / timespanSeconds) * 100) / 100,
    averageLatencyMs: Math.round(overallAvgLatency * 10) / 10,
    totalErrors,
    errorRate: totalRequests > 0 ? Math.round((totalErrors / totalRequests) * 1000) / 1000 : 0,
    errorBreakdown: {
      clientErrors: totalClientErrors,
      serverErrors: totalServerErrors
    },
    totalResponseBytes: totalBytes > 0 ? totalBytes : null,
    source: 'in_memory_traffic_instrumentation',
    limitations:
      'Backend API traffic only. Web analytics (page views, user sessions, bounce rate) are not collected because this application does not integrate with client-side analytics.'
  };

  // Pagination
  const total = formattedRecords.length;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const offset = (pageNum - 1) * limitNum;
  const paginatedData = formattedRecords.slice(offset, offset + limitNum);
  const hasMore = offset + paginatedData.length < total;

  return {
    data: paginatedData,
    summary,
    total,
    page: pageNum,
    limit: limitNum,
    hasMore
  };
}

/**
 * Get real-time traffic snapshot for integration /metrics endpoint
 */
function getRealtimeTrafficSummary(windowMinutes = 5) {
  const now = Date.now();
  const windowMs = windowMinutes * 60 * 1000;
  const cutoff = now - windowMs;

  let requestCount = 0;
  let totalDurationMs = 0;
  let clientErrors = 0;
  let serverErrors = 0;
  const durations = [];

  for (const [timestampMs, bucket] of trafficBuckets.entries()) {
    if (timestampMs >= cutoff) {
      requestCount += bucket.requestCount;
      totalDurationMs += bucket.totalDurationMs;
      clientErrors += bucket.statusGroups['4xx'];
      serverErrors += bucket.statusGroups['5xx'];
      durations.push(...bucket.durations);
    }
  }

  durations.sort((a, b) => a - b);
  const totalErrors = clientErrors + serverErrors;

  return {
    windowMinutes,
    requestCount,
    requestsPerSecond: Math.round((requestCount / (windowMinutes * 60)) * 100) / 100,
    averageLatencyMs: requestCount > 0 ? Math.round((totalDurationMs / requestCount) * 10) / 10 : null,
    p50LatencyMs: durations.length > 0 ? Math.round(calculatePercentile(durations, 50) * 10) / 10 : null,
    p95LatencyMs: durations.length > 0 ? Math.round(calculatePercentile(durations, 95) * 10) / 10 : null,
    errorRate: requestCount > 0 ? Math.round((totalErrors / requestCount) * 1000) / 1000 : 0,
    clientErrors,
    serverErrors,
    source: 'in_memory_sliding_window'
  };
}

/**
 * Reset in-memory metrics for testing
 */
function _resetForTesting() {
  trafficBuckets.clear();
  recentRequestsRing.length = 0;
}

module.exports = {
  trafficInstrumentationMiddleware,
  recordRequestMeasurement,
  getAggregatedTraffic,
  getRealtimeTrafficSummary,
  normalizeRoutePath,
  classifyStatusCode,
  _resetForTesting
};
