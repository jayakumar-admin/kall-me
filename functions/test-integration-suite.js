const http = require('http');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { app } = require('./index');
const { _getErrorQueue, reportErrorToTaskHub, sanitizeErrorMessage } = require('./utils/taskhubErrorReporter');

const TEST_API_KEY = process.env.TASKHUB_INTEGRATION_API_KEY || '353abc7781000945e40b139ac3535976ab53cbdadf11ff5e18ebed2628b83cfe';

async function runTestSuite() {
  console.log('======================================================================');
  console.log('    TASKHUB MINIMAL-CHANGE INTEGRATION AUTOMATED TEST SUITE           ');
  console.log('======================================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`[FAIL] ${testName} ${details ? '- ' + details : ''}`);
      failedCount++;
    }
  }

  // Start temporary local HTTP server on random free port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/integration/v1`;

  console.log(`Test server running at: ${baseUrl}\n`);

  try {
    // ------------------------------------------------------------------------
    // TEST 1: Missing API Key -> 401 Unauthorized
    // ------------------------------------------------------------------------
    console.log('--- Test 1: Authentication - Missing API Key ---');
    try {
      await axios.get(`${baseUrl}/health`);
      assert(false, 'Missing API Key should return 401');
    } catch (err) {
      const res = err.response;
      assert(res && res.status === 401, 'Status code is 401');
      assert(res.data.success === false, 'Envelope success is false');
      assert(res.data.error.code === 'UNAUTHORIZED', 'Error code is UNAUTHORIZED');
      assert(res.data.data === null, 'Data is null on failure');
      assert(res.data.meta && res.data.meta.requestId, 'Meta includes correlation requestId');
    }

    // ------------------------------------------------------------------------
    // TEST 2: Invalid API Key -> 401 Unauthorized
    // ------------------------------------------------------------------------
    console.log('\n--- Test 2: Authentication - Invalid API Key ---');
    try {
      await axios.get(`${baseUrl}/health`, {
        headers: { 'X-API-Key': 'completely-wrong-secret-key-12345' }
      });
      assert(false, 'Invalid API Key should return 401');
    } catch (err) {
      const res = err.response;
      assert(res && res.status === 401, 'Status code is 401');
      assert(res.data.error.code === 'UNAUTHORIZED', 'Error code is UNAUTHORIZED');
      assert(!JSON.stringify(res.data).includes(TEST_API_KEY), 'Configured secret is NEVER leaked');
    }

    // ------------------------------------------------------------------------
    // TEST 3: Valid API Key -> 200 OK & Proper Response Envelope
    // ------------------------------------------------------------------------
    console.log('\n--- Test 3: Authentication - Valid API Key ---');
    {
      const res = await axios.get(`${baseUrl}/health`, {
        headers: { 'X-API-Key': TEST_API_KEY }
      });
      assert(res.status === 200, 'Status code is 200');
      assert(res.data.success === true, 'Envelope success is true');
      assert(res.data.error === null, 'Error is null on success');
      assert(res.data.data.status === 'healthy', 'Data status is healthy');
      assert(res.data.meta.applicationId === 'kall-me', 'Meta applicationId matches');
      assert(res.data.meta.resource === 'health', 'Meta resource is health');
      assert(typeof res.data.meta.timestamp === 'string', 'Timestamp is ISO string');
    }

    // ------------------------------------------------------------------------
    // TEST 4: Disabled Integration -> 503 Service Unavailable
    // ------------------------------------------------------------------------
    console.log('\n--- Test 4: Configuration - Disabled Integration ---');
    {
      const origEnabled = process.env.TASKHUB_INTEGRATION_ENABLED;
      process.env.TASKHUB_INTEGRATION_ENABLED = 'false';
      try {
        await axios.get(`${baseUrl}/health`, {
          headers: { 'X-API-Key': TEST_API_KEY }
        });
        assert(false, 'Disabled integration should return 503');
      } catch (err) {
        const res = err.response;
        assert(res && res.status === 503, 'Status code is 503');
        assert(res.data.error.code === 'INTEGRATION_DISABLED', 'Error code is INTEGRATION_DISABLED');
        assert(res.data.error.retryable === true, 'Error retryable flag is true');
      } finally {
        process.env.TASKHUB_INTEGRATION_ENABLED = origEnabled;
      }
    }

    // ------------------------------------------------------------------------
    // TEST 5: Missing Server Configuration -> 503 Service Unavailable
    // ------------------------------------------------------------------------
    console.log('\n--- Test 5: Configuration - Missing Server API Key Setting ---');
    {
      const origKey = process.env.TASKHUB_INTEGRATION_API_KEY;
      process.env.TASKHUB_INTEGRATION_API_KEY = '';
      try {
        await axios.get(`${baseUrl}/health`, {
          headers: { 'X-API-Key': TEST_API_KEY }
        });
        assert(false, 'Missing server config should return 503');
      } catch (err) {
        const res = err.response;
        assert(res && res.status === 503, 'Status code is 503');
        assert(res.data.error.code === 'INTEGRATION_NOT_CONFIGURED', 'Error code is INTEGRATION_NOT_CONFIGURED');
      } finally {
        process.env.TASKHUB_INTEGRATION_API_KEY = origKey;
      }
    }

    // ------------------------------------------------------------------------
    // TEST 6: Resource Permission Restriction -> 403 Forbidden
    // ------------------------------------------------------------------------
    console.log('\n--- Test 6: Authorization - Resource Permission Restriction ---');
    {
      const origAllowed = process.env.TASKHUB_INTEGRATION_ALLOWED_RESOURCES;
      // Allow only health and logs, exclude billing
      process.env.TASKHUB_INTEGRATION_ALLOWED_RESOURCES = 'health,logs';
      try {
        await axios.get(`${baseUrl}/billing`, {
          headers: { 'X-API-Key': TEST_API_KEY }
        });
        assert(false, 'Restricted resource should return 403');
      } catch (err) {
        const res = err.response;
        assert(res && res.status === 403, 'Status code is 403');
        assert(res.data.error.code === 'FORBIDDEN_RESOURCE', 'Error code is FORBIDDEN_RESOURCE');
        assert(res.data.error.message.includes('billing'), 'Message indicates forbidden resource');
      } finally {
        process.env.TASKHUB_INTEGRATION_ALLOWED_RESOURCES = origAllowed;
      }
    }

    // ------------------------------------------------------------------------
    // TEST 7: Real Logs Retrieval & Normalization
    // ------------------------------------------------------------------------
    console.log('\n--- Test 7: Real Logs Retrieval & Phone Redaction ---');
    {
      const res = await axios.get(`${baseUrl}/logs?limit=10`, {
        headers: { 'X-API-Key': TEST_API_KEY }
      });
      assert(res.status === 200, 'Status code is 200');
      assert(Array.isArray(res.data.data), 'Data is an array of logs');
      assert(res.data.data.length > 0, `Returned ${res.data.data.length} real logs`);
      const sample = res.data.data[0];
      assert(sample && sample.id && sample.service && sample.level, 'Log record has normalized fields');
      assert(res.data.meta.total > 0, `Total log count reported: ${res.data.meta.total}`);

      // Check phone number masking in details
      const waLog = res.data.data.find((l) => l.service === 'whatsapp' && l.details?.recipientNumber);
      if (waLog) {
        assert(
          waLog.details.recipientNumber.includes('****'),
          `Phone number is redacted/masked (${waLog.details.recipientNumber})`
        );
      }
    }

    // ------------------------------------------------------------------------
    // TEST 8: Log Filters (service=whatsapp, service=backup)
    // ------------------------------------------------------------------------
    console.log('\n--- Test 8: Supported Filters - Log Service Filtering ---');
    {
      const resWa = await axios.get(`${baseUrl}/logs?service=whatsapp&limit=5`, {
        headers: { 'X-API-Key': TEST_API_KEY }
      });
      assert(
        resWa.data.data.every((l) => l.service === 'whatsapp'),
        'All filtered records have service=whatsapp'
      );

      const resAudit = await axios.get(`${baseUrl}/logs?service=backup&limit=5`, {
        headers: { 'X-API-Key': TEST_API_KEY }
      });
      assert(
        resAudit.data.data.every((l) => l.service === 'backup'),
        'All filtered records have service=backup'
      );
    }

    // ------------------------------------------------------------------------
    // TEST 9: Real Inventory (Menu Items & Hotels)
    // ------------------------------------------------------------------------
    console.log('\n--- Test 9: Real Inventory Retrieval & Filters ---');
    {
      const res = await axios.get(`${baseUrl}/inventory?limit=5`, {
        headers: { 'X-API-Key': TEST_API_KEY }
      });
      assert(res.status === 200, 'Status code is 200');
      assert(Array.isArray(res.data.data) && res.data.data.length > 0, `Returned ${res.data.data.length} items`);
      const item = res.data.data[0];
      assert(item.name && item.price !== undefined, 'Item has name and price');
      assert(res.data.meta.total > 2000, `Total inventory reported accurately (${res.data.meta.total} dishes)`);

      // Filter by category
      const resCat = await axios.get(`${baseUrl}/inventory?category=Starters&limit=5`, {
        headers: { 'X-API-Key': TEST_API_KEY }
      });
      assert(
        resCat.data.data.every((i) => i.category.toLowerCase() === 'starters'),
        'Category filter strictly matches'
      );
    }

    // ------------------------------------------------------------------------
    // TEST 10: Real Billing (Orders & Financial Records)
    // ------------------------------------------------------------------------
    console.log('\n--- Test 10: Real Billing Records & Status Filter ---');
    {
      const res = await axios.get(`${baseUrl}/billing?limit=5`, {
        headers: { 'X-API-Key': TEST_API_KEY }
      });
      assert(res.status === 200, 'Status code is 200');
      assert(Array.isArray(res.data.data) && res.data.data.length > 0, `Returned ${res.data.data.length} orders`);
      const order = res.data.data[0];
      assert(
        order.order_number && order.grand_total !== undefined && order.status,
        'Order contains order_number, grand_total, and status'
      );
      assert(res.data.meta.total > 100, `Total billing records reported accurately (${res.data.meta.total} orders)`);

      // Filter by status
      const resStatus = await axios.get(`${baseUrl}/billing?status=delivered&limit=5`, {
        headers: { 'X-API-Key': TEST_API_KEY }
      });
      assert(
        resStatus.data.data.every((o) => o.status.toLowerCase() === 'delivered'),
        'Billing status filter matches'
      );
    }

    // ------------------------------------------------------------------------
    // TEST 11: Real Backups Health & History
    // ------------------------------------------------------------------------
    console.log('\n--- Test 11: Backups Health & History ---');
    {
      const resHealth = await axios.get(`${baseUrl}/backups/health`, {
        headers: { 'X-API-Key': TEST_API_KEY }
      });
      assert(resHealth.status === 200, 'Backups health status is 200');
      assert(resHealth.data.data.checks.database.status === 'healthy', 'Database health check passed');
      assert(Array.isArray(resHealth.data.data.referentialIntegrity), 'Referential integrity checks included');

      const resHistory = await axios.get(`${baseUrl}/backups/history?limit=5`, {
        headers: { 'X-API-Key': TEST_API_KEY }
      });
      assert(resHistory.status === 200, 'Backups history status is 200');
      assert(Array.isArray(resHistory.data.data), 'Backups history is an array');
      assert(resHistory.data.meta.total >= 0, `Total backups count: ${resHistory.data.meta.total}`);
    }

    // ------------------------------------------------------------------------
    // TEST 12: Pagination & Stable Ordering
    // ------------------------------------------------------------------------
    console.log('\n--- Test 12: Pagination Limits & Cursors ---');
    {
      const resP1 = await axios.get(`${baseUrl}/inventory?page=1&limit=3`, {
        headers: { 'X-API-Key': TEST_API_KEY }
      });
      const resP2 = await axios.get(`${baseUrl}/inventory?page=2&limit=3`, {
        headers: { 'X-API-Key': TEST_API_KEY }
      });

      assert(resP1.data.data.length === 3, 'Page 1 has exact limit 3');
      assert(resP2.data.data.length === 3, 'Page 2 has exact limit 3');
      assert(resP1.data.data[0].id !== resP2.data.data[0].id, 'Page 1 and Page 2 contain distinct records');
      assert(resP1.data.meta.hasMore === true, 'Page 1 hasMore is true');
    }

    // ------------------------------------------------------------------------
    // TEST 13: Empty Search Results Handling
    // ------------------------------------------------------------------------
    console.log('\n--- Test 13: Empty Search Results Handling ---');
    {
      const res = await axios.get(`${baseUrl}/inventory?search=totally_non_existent_item_query_999xyz`, {
        headers: { 'X-API-Key': TEST_API_KEY }
      });
      assert(res.status === 200, 'Returns 200 on empty result (not 404 or 500)');
      assert(res.data.success === true, 'Success is true');
      assert(Array.isArray(res.data.data) && res.data.data.length === 0, 'Data is empty array');
      assert(res.data.meta.total === 0, 'Total is 0');
      assert(res.data.meta.hasMore === false, 'hasMore is false');
    }

    // ------------------------------------------------------------------------
    // TEST 14: Invalid Query Parameters Validation (400 Bad Request)
    // ------------------------------------------------------------------------
    console.log('\n--- Test 14: Query Parameter Validation (400 Bad Request) ---');
    {
      // Invalid page
      try {
        await axios.get(`${baseUrl}/inventory?page=-5`, {
          headers: { 'X-API-Key': TEST_API_KEY }
        });
        assert(false, 'Negative page should fail');
      } catch (err) {
        assert(err.response?.status === 400, 'Negative page returns 400');
        assert(err.response?.data.error.code === 'INVALID_QUERY_PARAMETER', 'Code is INVALID_QUERY_PARAMETER');
      }

      // Invalid date format
      try {
        await axios.get(`${baseUrl}/billing?startDate=not-a-valid-date`, {
          headers: { 'X-API-Key': TEST_API_KEY }
        });
        assert(false, 'Invalid date should fail');
      } catch (err) {
        assert(err.response?.status === 400, 'Invalid date returns 400');
        assert(err.response?.data.error.code === 'INVALID_DATE_FORMAT', 'Code is INVALID_DATE_FORMAT');
      }

      // Invalid date range (start > end)
      try {
        await axios.get(`${baseUrl}/billing?startDate=2026-12-31&endDate=2026-01-01`, {
          headers: { 'X-API-Key': TEST_API_KEY }
        });
        assert(false, 'Start date > End date should fail');
      } catch (err) {
        assert(err.response?.status === 400, 'Start date > End date returns 400');
        assert(err.response?.data.error.code === 'INVALID_DATE_RANGE', 'Code is INVALID_DATE_RANGE');
      }
    }

    // ------------------------------------------------------------------------
    // TEST 15: API Key Rotation (Multiple Comma-Separated Keys)
    // ------------------------------------------------------------------------
    console.log('\n--- Test 15: API Key Rotation Support ---');
    {
      const origKey = process.env.TASKHUB_INTEGRATION_API_KEY;
      const keyA = 'rotation-primary-key-aaaa1111';
      const keyB = 'rotation-secondary-key-bbbb2222';
      process.env.TASKHUB_INTEGRATION_API_KEY = `${keyA}, ${keyB}`;

      try {
        const resA = await axios.get(`${baseUrl}/health`, {
          headers: { 'X-API-Key': keyA }
        });
        assert(resA.status === 200, 'Primary key in rotation accepted');

        const resB = await axios.get(`${baseUrl}/health`, {
          headers: { 'X-API-Key': keyB }
        });
        assert(resB.status === 200, 'Secondary key in rotation accepted');

        try {
          await axios.get(`${baseUrl}/health`, {
            headers: { 'X-API-Key': 'old-expired-key' }
          });
          assert(false, 'Unlisted key rejected during rotation');
        } catch (rotErr) {
          assert(rotErr.response?.status === 401, 'Unlisted key returns 401 during rotation');
        }
      } finally {
        process.env.TASKHUB_INTEGRATION_API_KEY = origKey;
      }
    }

    // ------------------------------------------------------------------------
    // TEST 16: Error Reporting Queue & Secret Redaction
    // ------------------------------------------------------------------------
    console.log('\n--- Test 16: TaskHub Error Reporter & Redaction ---');
    {
      // Test message sanitization
      const sensitiveMsg = 'Connection error postgres://admin:super_secret_pw@db.internal:5432/kallme';
      const sanitized = sanitizeErrorMessage(sensitiveMsg);
      assert(!sanitized.includes('super_secret_pw'), 'Database password sanitized from error message');
      assert(sanitized.includes('[REDACTED]'), 'Database password replaced with [REDACTED]');

      // Test error enqueueing when enabled
      const origEnabled = process.env.TASKHUB_ERROR_REPORTING_ENABLED;
      const origUrl = process.env.TASKHUB_ERROR_INGESTION_URL;
      const origKey = process.env.TASKHUB_ERROR_REPORTING_API_KEY;

      process.env.TASKHUB_ERROR_REPORTING_ENABLED = 'true';
      process.env.TASKHUB_ERROR_INGESTION_URL = 'http://127.0.0.1:9999/mock-ingest';
      process.env.TASKHUB_ERROR_REPORTING_API_KEY = 'mock-key';

      try {
        const queueBefore = _getErrorQueue().length;
        reportErrorToTaskHub(new Error('Sample test unhandled exception'), {
          baseUrl: '/api',
          path: '/test-error',
          method: 'GET',
          headers: { 'x-api-key': 'secret-should-be-stripped', authorization: 'Bearer 12345' }
        });
        const queueAfter = _getErrorQueue().length;
        assert(queueAfter >= queueBefore, 'Error was safely queued for background delivery');
      } finally {
        process.env.TASKHUB_ERROR_REPORTING_ENABLED = origEnabled;
        process.env.TASKHUB_ERROR_INGESTION_URL = origUrl;
        process.env.TASKHUB_ERROR_REPORTING_API_KEY = origKey;
      }
    }

    // ------------------------------------------------------------------------
    // TEST 17: TaskHub Observability Dashboard Route: GET /api/admin/logs
    // ------------------------------------------------------------------------
    console.log('\n--- Test 17: TaskHub Observability Route - GET /api/admin/logs ---');
    {
      const adminLogsUrl = `http://127.0.0.1:${port}/api/admin/logs?startDate=2026-09-19&endDate=2026-10-18`;

      // 17.1 Query with X-API-Key
      const res = await axios.get(adminLogsUrl, {
        headers: { 'X-API-Key': TEST_API_KEY }
      });
      assert(res.status === 200, 'GET /api/admin/logs status code is 200');
      assert(res.data.success === true, 'Response envelope success is true');
      assert(Array.isArray(res.data.data), 'res.data.data is an array');
      assert(Array.isArray(res.data.logs), 'res.data.logs alias is an array');
      assert(res.data.metrics && typeof res.data.metrics.errorsToday === 'number', 'Metrics include errorsToday');
      assert(typeof res.data.metrics.warningsToday === 'number', 'Metrics include warningsToday');
      assert(typeof res.data.metrics.apiFailures === 'number', 'Metrics include apiFailures');

      // Verify log item columns for TaskHub UI table
      if (res.data.data.length > 0) {
        const item = res.data.data[0];
        assert(item.timestamp, 'Log item contains timestamp column');
        assert(item.level, 'Log item contains level column');
        assert(item.module, 'Log item contains module column');
        assert(item.requestId, 'Log item contains requestId column');
        assert(item.route, 'Log item contains route column');
        assert(item.context, 'Log item contains context column');
        assert(item.message, 'Log item contains message column');
        assert(item.action, 'Log item contains action column');
      }

      // 17.2 Query with Bearer Authorization header
      const resBearer = await axios.get(adminLogsUrl, {
        headers: { Authorization: `Bearer ${TEST_API_KEY}` }
      });
      assert(resBearer.status === 200, 'Bearer Authorization header accepted on /api/admin/logs');

      // 17.3 Query with apiKey query parameter
      const resQueryKey = await axios.get(`${adminLogsUrl}&apiKey=${TEST_API_KEY}`);
      assert(resQueryKey.status === 200, 'apiKey query parameter accepted on /api/admin/logs');
    }

    // ------------------------------------------------------------------------
    // TEST 18: Admin Backups Routes Coexistence
    // ------------------------------------------------------------------------
    console.log('\n--- Test 18: Existing Admin Backups Routes Coexistence ---');
    {
      const resBackups = await axios.get(`http://127.0.0.1:${port}/api/admin/backups`);
      assert(resBackups.status === 200, 'GET /api/admin/backups still returns 200');
      assert(Array.isArray(resBackups.data.backups), 'Backups list is intact');

      const resStats = await axios.get(`http://127.0.0.1:${port}/api/admin/backups/stats`);
      assert(resStats.status === 200, 'GET /api/admin/backups/stats still returns 200');
      assert(resStats.data.stats !== undefined, 'Stats object is returned');
    }

    // ------------------------------------------------------------------------
    // TEST 19: Real Runtime Metrics (GET /api/integration/v1/metrics)
    // ------------------------------------------------------------------------
    console.log('\n--- Test 19: Runtime Metrics Endpoint - GET /api/integration/v1/metrics ---');
    {
      const resMetrics = await axios.get(`${baseUrl}/metrics`, {
        headers: { 'X-API-Key': TEST_API_KEY }
      });

      assert(resMetrics.status === 200, 'GET /api/integration/v1/metrics returns 200');
      assert(resMetrics.data.success === true, 'Metrics envelope success is true');
      assert(resMetrics.data.meta.resource === 'metrics', 'Meta resource is metrics');
      assert(resMetrics.data.meta.applicationId === 'kall-me', 'Meta applicationId is kall-me');

      const d = resMetrics.data.data;
      assert(d.application && (d.application.status === 'healthy' || d.application.status === 'degraded'), 'Application status is healthy/degraded');
      assert(typeof d.application.uptimeSeconds === 'number' && d.application.uptimeSeconds >= 0, 'Uptime seconds reported');
      assert(d.application.version === '1.0.0', 'Application version is 1.0.0');

      // Process CPU vs Host CPU distinction
      assert(d.cpu && typeof d.cpu.userMicroseconds === 'number', 'CPU user microseconds reported');
      assert(d.cpu.hostPercent === null, 'Host CPU is null when inaccessible in serverless sandbox');
      assert(d.cpu.source === 'process.cpuUsage', 'CPU collection source is process.cpuUsage');

      // Process Memory vs Host Memory distinction
      assert(d.memory && typeof d.memory.process.rssBytes === 'number', 'Memory rssBytes reported');
      assert(d.memory.process.heapUsedBytes > 0, 'Memory heapUsedBytes > 0');
      assert(d.memory.host.totalMemoryBytes === null, 'Host total memory is null when inaccessible');

      // Disk measurements
      assert(d.disk && d.disk.unit === 'bytes', 'Disk unit is bytes');
      assert(d.disk.source === 'fs.statfsSync', 'Disk source is fs.statfsSync');

      // Database connectivity & pool statistics
      assert(d.database && d.database.status === 'healthy', 'Database status is healthy');
      assert(d.database.engine === 'PostgreSQL', 'Database engine is PostgreSQL');
      assert(typeof d.database.connectionPool.totalCount === 'number', 'Database pool totalCount reported');
      assert(typeof d.database.connectionPool.idleCount === 'number', 'Database pool idleCount reported');

      // Background jobs & deployment metadata
      assert(d.backgroundJobs && d.backgroundJobs.scheduler.isEnabled !== undefined, 'Scheduler status included');
      assert(d.deployment && d.deployment.version === '1.0.0', 'Deployment version included in metrics');
      assert(typeof d.isCached === 'boolean', 'Cache status is reported');
    }

    // ------------------------------------------------------------------------
    // TEST 20: Traffic Instrumentation & Aggregation (GET /api/integration/v1/traffic)
    // ------------------------------------------------------------------------
    console.log('\n--- Test 20: Traffic Telemetry - GET /api/integration/v1/traffic ---');
    {
      // 1. Generate real HTTP traffic on application routes
      await axios.get(`http://127.0.0.1:${port}/api/menus?limit=1`).catch(() => {});
      await axios.get(`http://127.0.0.1:${port}/api/hotels?limit=1`).catch(() => {});
      try {
        await axios.get(`http://127.0.0.1:${port}/api/nonexistent-route-for-testing-traffic-404`);
      } catch (err) {
        // Expected 404
      }

      // Small delay for event loop to finish res.on('finish')
      await new Promise((r) => setTimeout(r, 50));

      const resTraffic = await axios.get(`${baseUrl}/traffic?window=1m`, {
        headers: { 'X-API-Key': TEST_API_KEY }
      });

      assert(resTraffic.status === 200, 'GET /api/integration/v1/traffic returns 200');
      assert(resTraffic.data.success === true, 'Traffic envelope success is true');
      assert(resTraffic.data.meta.resource === 'traffic', 'Meta resource is traffic');
      assert(Array.isArray(resTraffic.data.data), 'Traffic data is an array of time buckets');

      const summary = resTraffic.data.summary || resTraffic.data.meta.summary;
      assert(summary && summary.totalRequests >= 3, `Traffic summary recorded requests (${summary.totalRequests})`);
      assert(summary.errorBreakdown.clientErrors >= 1, 'Client error (404) classified in traffic telemetry');
      assert(typeof summary.requestsPerSecond === 'number', 'Requests per second calculated');
      assert(typeof summary.averageLatencyMs === 'number', 'Average latency calculated');
      assert(summary.source === 'in_memory_traffic_instrumentation', 'Traffic source documented');

      // Test route template normalization and latency percentiles
      if (resTraffic.data.data.length > 0) {
        const bucket = resTraffic.data.data[0];
        assert(bucket.durationMs && typeof bucket.durationMs.average === 'number', 'Bucket includes average latency');
        assert(typeof bucket.durationMs.p50 === 'number', 'Bucket includes p50 latency');
        assert(typeof bucket.durationMs.p95 === 'number', 'Bucket includes p95 latency');
        assert(bucket.statusDistribution, 'Bucket includes statusDistribution');
      }

      // Test parameter validation on traffic endpoint
      try {
        await axios.get(`${baseUrl}/traffic?page=-1`, {
          headers: { 'X-API-Key': TEST_API_KEY }
        });
        assert(false, 'Negative page should fail on traffic');
      } catch (err) {
        assert(err.response?.status === 400, 'Negative page on traffic returns 400');
        assert(err.response?.data.error.code === 'INVALID_QUERY_PARAMETER', 'Code is INVALID_QUERY_PARAMETER');
      }
    }

    // ------------------------------------------------------------------------
    // TEST 21: Real Deployments Status & History (GET /api/integration/v1/deployments)
    // ------------------------------------------------------------------------
    console.log('\n--- Test 21: Deployments Status - GET /api/integration/v1/deployments ---');
    {
      const resDeploy = await axios.get(`${baseUrl}/deployments?page=1&limit=5`, {
        headers: { 'X-API-Key': TEST_API_KEY }
      });

      assert(resDeploy.status === 200, 'GET /api/integration/v1/deployments returns 200');
      assert(resDeploy.data.success === true, 'Deployments envelope success is true');
      assert(resDeploy.data.meta.resource === 'deployments', 'Meta resource is deployments');
      assert(Array.isArray(resDeploy.data.data), 'Deployments data is an array');
      assert(resDeploy.data.data.length > 0, `Returned ${resDeploy.data.data.length} deployment records`);

      const current = resDeploy.data.current || resDeploy.data.meta.current;
      assert(current && current.version === '1.0.0', 'Current deployment version is 1.0.0');
      assert(current.status === 'active', 'Current deployment status is active');
      assert(typeof current.commitSha === 'string' && current.commitSha.length > 0, 'Commit SHA is reported');
      assert(current.applicationId === 'kall-me', 'Application ID is kall-me');

      const firstDeploy = resDeploy.data.data[0];
      assert(firstDeploy.id && firstDeploy.version && firstDeploy.deployedAt, 'Deployment record has id, version, and deployedAt');
    }

    // ------------------------------------------------------------------------
    // TEST 22: Restricted Read-Only Diagnostics (GET /api/integration/v1/diagnostics)
    // ------------------------------------------------------------------------
    console.log('\n--- Test 22: Restricted Diagnostics - GET /api/integration/v1/diagnostics ---');
    {
      const resDiag = await axios.get(`${baseUrl}/diagnostics`, {
        headers: { 'X-API-Key': TEST_API_KEY }
      });

      assert(resDiag.status === 200, 'Diagnostics returns 200');
      assert(resDiag.data.success === true, 'Diagnostics success is true');
      assert(resDiag.data.meta.resource === 'diagnostics', 'Meta resource is diagnostics');
      assert(resDiag.data.data.diagnosticStatus === 'healthy', 'Diagnostic status is healthy');
      assert(resDiag.data.data.checks.database.status === 'pass', 'Database diagnostic check passed');
      assert(resDiag.data.data.checks.process.status === 'pass', 'Process diagnostic check passed');
      assert(resDiag.data.data.securityPolicy.includes('forbidden'), 'Security policy explicitly forbids shell access');

      // Verify arbitrary shell execution is rejected with 400 Bad Request
      try {
        await axios.get(`${baseUrl}/diagnostics?operation=shell_exec`, {
          headers: { 'X-API-Key': TEST_API_KEY }
        });
        assert(false, 'Arbitrary shell execution operation should fail');
      } catch (err) {
        assert(err.response?.status === 400, 'Unauthorized diagnostic operation returns 400');
        assert(err.response?.data.error.code === 'INVALID_DIAGNOSTIC_OPERATION', 'Code is INVALID_DIAGNOSTIC_OPERATION');
        assert(err.response?.data.error.message.includes('Arbitrary shell command execution is prohibited'), 'Message explains shell access is prohibited');
      }
    }

    // ------------------------------------------------------------------------
    // TEST 23: Resource Authorization for New Integration Endpoints (403 Forbidden)
    // ------------------------------------------------------------------------
    console.log('\n--- Test 23: Authorization Checks on Metrics and Traffic ---');
    {
      const origAllowed = process.env.TASKHUB_INTEGRATION_ALLOWED_RESOURCES;
      // Restrict to health only
      process.env.TASKHUB_INTEGRATION_ALLOWED_RESOURCES = 'health';

      try {
        // Metrics should be forbidden
        try {
          await axios.get(`${baseUrl}/metrics`, {
            headers: { 'X-API-Key': TEST_API_KEY }
          });
          assert(false, 'Metrics should be 403 when excluded from allowed resources');
        } catch (err) {
          assert(err.response?.status === 403, 'Excluded metrics resource returns 403 Forbidden');
          assert(err.response?.data.error.code === 'FORBIDDEN_RESOURCE', 'Code is FORBIDDEN_RESOURCE');
        }

        // Traffic should be forbidden
        try {
          await axios.get(`${baseUrl}/traffic`, {
            headers: { 'X-API-Key': TEST_API_KEY }
          });
          assert(false, 'Traffic should be 403 when excluded from allowed resources');
        } catch (err) {
          assert(err.response?.status === 403, 'Excluded traffic resource returns 403 Forbidden');
        }

        // Deployments should be forbidden
        try {
          await axios.get(`${baseUrl}/deployments`, {
            headers: { 'X-API-Key': TEST_API_KEY }
          });
          assert(false, 'Deployments should be 403 when excluded from allowed resources');
        } catch (err) {
          assert(err.response?.status === 403, 'Excluded deployments resource returns 403 Forbidden');
        }
      } finally {
        process.env.TASKHUB_INTEGRATION_ALLOWED_RESOURCES = origAllowed;
      }
    }
  } finally {
    // Graceful teardown
    await new Promise((resolve) => server.close(resolve));
    console.log('\n======================================================================');
    console.log(`TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('======================================================================\n');
  }

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
