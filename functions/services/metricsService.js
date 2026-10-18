/**
 * Kall Me - TaskHub Observability Integration: Metrics Service
 *
 * Collects and exposes genuine application-process metrics, database connectivity,
 * connection pool statistics, background job status, and traffic measurements.
 *
 * Adheres to TaskHub rules:
 * - Distinguishes application-process metrics from host/container metrics.
 * - Does not claim host-level CPU, memory, disk, or network usage when inaccessible.
 * - Never returns zero when a measurement is unavailable (uses null).
 * - Caches expensive measurements briefly (5 seconds) with timestamp.
 */

const fs = require('fs');
const path = require('path');
const db = require('../db');
const { getRealtimeTrafficSummary } = require('./trafficMetricsService');
const { getCurrentDeployment } = require('./deploymentService');
const { getSchedulerStatus } = require('../utils/backupScheduler');

// Brief in-memory cache to prevent expensive repeated queries during high polling
let cachedMetrics = null;
let lastCollectedAtMs = 0;
const CACHE_TTL_MS = 5 * 1000; // 5-second cache

// Store previous CPU snapshot to calculate delta percentage
let lastCpuUsage = process.cpuUsage();
let lastCpuTimeMs = Date.now();

/**
 * Measure CPU percentage for the current Node.js process over the interval
 */
function getProcessCpuUsage() {
  const currentCpuTimeMs = Date.now();
  const currentCpuUsage = process.cpuUsage();

  const elapsedMs = currentCpuTimeMs - lastCpuTimeMs;
  let processPercent = null;

  if (elapsedMs > 500) {
    const userDiffMicros = currentCpuUsage.user - lastCpuUsage.user;
    const sysDiffMicros = currentCpuUsage.system - lastCpuUsage.system;
    const totalCpuMicros = userDiffMicros + sysDiffMicros;
    // Total elapsed process time in microseconds = elapsedMs * 1000
    processPercent = Math.min(100, Math.round((totalCpuMicros / (elapsedMs * 1000)) * 1000) / 10);

    lastCpuUsage = currentCpuUsage;
    lastCpuTimeMs = currentCpuTimeMs;
  }

  return {
    processPercent,
    hostPercent: null, // Host-level CPU cannot be claimed from serverless/container process
    userMicroseconds: currentCpuUsage.user,
    systemMicroseconds: currentCpuUsage.system,
    unit: 'microseconds, percentage',
    source: 'process.cpuUsage',
    limitation:
      'Process-level CPU time for the Node.js runtime. Host-level CPU requires platform metrics agent.'
  };
}

/**
 * Collect memory statistics distinguishing process memory from container/host memory
 */
function getMemoryMetrics() {
  const mem = process.memoryUsage();
  const toMb = (bytes) => Math.round((bytes / (1024 * 1024)) * 100) / 100;

  return {
    process: {
      rssBytes: mem.rss,
      heapTotalBytes: mem.heapTotal,
      heapUsedBytes: mem.heapUsed,
      externalBytes: mem.external,
      arrayBuffersBytes: mem.arrayBuffers || null,
      rssMb: toMb(mem.rss),
      heapUsedMb: toMb(mem.heapUsed),
      heapTotalMb: toMb(mem.heapTotal)
    },
    host: {
      totalMemoryBytes: null,
      freeMemoryBytes: null,
      usedPercentage: null
    },
    unit: 'bytes',
    source: 'process.memoryUsage',
    limitation:
      'Measurements reflect the Node.js process memory. Total container/host memory quota is managed by the cloud platform.'
  };
}

/**
 * Collect filesystem / disk measurements safely using Node.js fs.statfsSync if available
 */
function getDiskMetrics() {
  try {
    if (typeof fs.statfsSync === 'function') {
      const stats = fs.statfsSync(path.join(__dirname, '..'));
      const bsize = stats.bsize || 4096;
      const totalBytes = stats.blocks * bsize;
      const freeBytes = stats.bavail * bsize;
      const usedBytes = (stats.blocks - stats.bfree) * bsize;
      const usedPercent = totalBytes > 0 ? Math.round(((totalBytes - freeBytes) / totalBytes) * 1000) / 10 : null;

      return {
        available: true,
        totalBytes,
        freeBytes,
        usedBytes,
        usedPercent,
        unit: 'bytes',
        source: 'fs.statfsSync',
        limitation: 'Application mount filesystem storage volume.'
      };
    }
  } catch (err) {
    // Filesystem stats restricted in certain sandbox platforms
  }

  return {
    available: false,
    totalBytes: null,
    freeBytes: null,
    usedBytes: null,
    usedPercent: null,
    unit: 'bytes',
    source: 'fs.statfsSync',
    limitation: 'Disk volume statistics not accessible within this execution sandbox.'
  };
}

/**
 * Measure database ping latency and connection pool statistics
 */
async function getDatabaseMetrics() {
  let status = 'healthy';
  let pingLatencyMs = null;
  let dbVersion = null;
  let activeConnections = null;

  try {
    const t0 = Date.now();
    const result = await db.query('SELECT 1 AS ping, version() AS version');
    pingLatencyMs = Date.now() - t0;
    if (result.rows[0]?.version) {
      dbVersion = result.rows[0].version.split(' ')[0] + ' ' + (result.rows[0].version.split(' ')[1] || '');
    }
  } catch (err) {
    status = 'unhealthy';
    console.warn('[Metrics Service] Database ping failed:', err.message);
  }

  // Inspect pg.Pool internals safely
  const pool = db.pool;
  const poolStats = {
    totalCount: pool?.totalCount ?? null,
    idleCount: pool?.idleCount ?? null,
    waitingCount: pool?.waitingCount ?? null
  };

  if (poolStats.totalCount !== null && poolStats.idleCount !== null) {
    activeConnections = Math.max(0, poolStats.totalCount - poolStats.idleCount);
  }

  return {
    status,
    engine: 'PostgreSQL',
    version: dbVersion,
    pingLatencyMs,
    connectionPool: poolStats,
    activeConnections,
    unit: 'connections, milliseconds',
    source: 'pg.Pool and SELECT 1 ping',
    limitation: 'Pool statistics reflect connections from this application process instance.'
  };
}

/**
 * Get background job status (scheduler + last backup)
 */
async function getBackgroundJobMetrics() {
  let schedulerStatus = null;
  try {
    schedulerStatus = getSchedulerStatus();
  } catch (err) {
    // Ignore scheduler error
  }

  let lastJobRecord = null;
  try {
    const res = await db.query(
      `SELECT backup_name, status, duration_ms, backup_size_bytes, created_at
       FROM backup_metadata
       ORDER BY created_at DESC
       LIMIT 1`
    );
    if (res.rows.length > 0) {
      lastJobRecord = {
        name: res.rows[0].backup_name,
        status: res.rows[0].status,
        durationMs: res.rows[0].duration_ms,
        sizeBytes: parseInt(res.rows[0].backup_size_bytes, 10),
        executedAt: res.rows[0].created_at
      };
    }
  } catch (err) {
    // Non-critical if table does not exist or db query fails
  }

  return {
    status: schedulerStatus?.isRunning ? 'healthy' : 'warning',
    scheduler: {
      isEnabled: schedulerStatus?.isEnabled ?? true,
      isRunning: schedulerStatus?.isRunning ?? false,
      frequency: schedulerStatus?.frequency ?? 'twice_weekly',
      executionTime: schedulerStatus?.executionTime ?? '02:00',
      timezone: schedulerStatus?.timezone ?? 'Asia/Kolkata',
      nextScheduledRun: schedulerStatus?.nextExecution ?? null,
      retentionCount: schedulerStatus?.retentionCount ?? 8
    },
    lastExecutedJob: lastJobRecord,
    source: 'node-cron scheduler & backup_metadata',
    limitation: 'Covers background database backup cron scheduler.'
  };
}

/**
 * Collect all real runtime metrics
 */
async function collectMetrics(forceRefresh = false) {
  const now = Date.now();

  if (!forceRefresh && cachedMetrics && now - lastCollectedAtMs < CACHE_TTL_MS) {
    return {
      ...cachedMetrics,
      isCached: true,
      cachedAt: new Date(lastCollectedAtMs).toISOString()
    };
  }

  const uptimeSeconds = Math.floor(process.uptime());
  const deployment = getCurrentDeployment();
  const traffic = getRealtimeTrafficSummary(5);
  const memory = getMemoryMetrics();
  const cpu = getProcessCpuUsage();
  const disk = getDiskMetrics();
  const database = await getDatabaseMetrics();
  const backgroundJobs = await getBackgroundJobMetrics();

  const isHealthy = database.status === 'healthy';

  const collectedMetrics = {
    collectedAt: new Date().toISOString(),
    isCached: false,
    application: {
      id: process.env.TASKHUB_APPLICATION_ID || 'kall-me',
      status: isHealthy ? 'healthy' : 'degraded',
      uptimeSeconds,
      environment: process.env.TASKHUB_ENVIRONMENT || process.env.NODE_ENV || 'production',
      version: deployment.version,
      source: 'application_process'
    },
    process: {
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptimeSeconds
    },
    cpu,
    memory,
    disk,
    network: {
      hostThroughputBytesPerSecond: null, // Not available without host root privileges
      applicationHttpThroughput: {
        requestsPerSecond: traffic.requestsPerSecond,
        windowMinutes: traffic.windowMinutes
      },
      unit: 'requests/second',
      source: 'traffic_instrumentation',
      limitation:
        'Host-level network interface counters are inaccessible in this serverless/container sandbox; application HTTP throughput reported.'
    },
    traffic: {
      requestRatePerSecond: traffic.requestsPerSecond,
      averageLatencyMs: traffic.averageLatencyMs,
      p50LatencyMs: traffic.p50LatencyMs,
      p95LatencyMs: traffic.p95LatencyMs,
      httpErrorRate: traffic.errorRate,
      clientErrors: traffic.clientErrors,
      serverErrors: traffic.serverErrors,
      windowMinutes: traffic.windowMinutes,
      source: 'in_memory_sliding_window'
    },
    database,
    backgroundJobs,
    deployment: {
      version: deployment.version,
      commitSha: deployment.commitSha,
      shortCommitSha: deployment.shortCommitSha,
      deployedAt: deployment.deployedAt,
      environment: deployment.environment,
      source: 'deployment_metadata'
    }
  };

  cachedMetrics = collectedMetrics;
  lastCollectedAtMs = now;

  return collectedMetrics;
}

module.exports = {
  collectMetrics,
  getProcessCpuUsage,
  getMemoryMetrics,
  getDiskMetrics,
  getDatabaseMetrics,
  getBackgroundJobMetrics
};
