# TaskHub Minimal-Change Observability Integration Guide

## 1. Executive Summary

This document describes the minimal-change TaskHub Observability and Management Integration implemented for **Kall Me** (`kall-me`), an Express.js backend running on Node.js (v24) with PostgreSQL and Firebase Functions / Google Cloud hosting.

The integration provides real runtime measurements, application-level traffic telemetry, structured database logs, deployment status, and restricted read-only diagnostics via a versioned API (`/api/integration/v1/*`), adhering strictly to TaskHub response envelopes and security policies.

---

## 2. Architecture & Inspection of Existing Application

| Dimension | Actual Implementation in Kall Me |
| :--- | :--- |
| **Backend Framework** | Express.js 5.1.0 on Node.js 24 |
| **Hosting Platform** | Firebase Cloud Functions (`functions.https.onRequest(app)`) / Google Cloud Run |
| **Process Manager** | Cloud Functions container runtime / Node process / nodemon in local dev |
| **Primary Database** | PostgreSQL (`pg` connection pool with SSL) |
| **Logging System** | PostgreSQL audit tables (`whatsapp_logs`, `backup_audit_logs`) + structured console logging |
| **Centralized Errors** | Express error-handling middleware (`taskhubErrorHandler`) with asynchronous bounded reporting |
| **Background Jobs** | `node-cron` twice-weekly backup scheduler (`0 2 * * 0,3` Asia/Kolkata) |
| **Traffic Telemetry** | Non-intrusive sliding-window HTTP instrumentation middleware (`trafficMetricsService.js`) |

### Process vs. Host Measurement Separation
- **Application Process Metrics**: Accurately collected from the Node.js runtime (`process.uptime()`, `process.memoryUsage()`, `process.cpuUsage()`, `process.pid`, `process.version`, `fs.statfsSync()`).
- **Host / Container Metrics**: Physical host-level CPU percentage, physical host total memory, and host physical network interface counters are **not** accessible within a serverless/container sandbox. In accordance with TaskHub standards, these fields are returned as `null` (with units and limitations explicitly declared) rather than fabricating numbers or claiming host-level access.

---

## 3. Configuration & Secret Provisioning

### Environment Variables
Configure the following in the server environment (or secret manager / `.env`):

```dotenv
# Enable or disable the TaskHub integration API
TASKHUB_INTEGRATION_ENABLED=true

# High-entropy secret API key (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
# Supports key rotation via comma-separated keys: "current_key, previous_key"
TASKHUB_INTEGRATION_API_KEY=353abc7781000945e40b139ac3535976ab53cbdadf11ff5e18ebed2628b83cfe

# Non-secret key identifier for audit logging and rotation tracking
TASKHUB_INTEGRATION_KEY_ID=kallme-prod-key-01

# Comma-separated list of permitted resources for this integration key
TASKHUB_INTEGRATION_ALLOWED_RESOURCES=health,metrics,logs,traffic,deployments,inventory,billing,backups,diagnostics

# Application identifier used in the response envelope
TASKHUB_APPLICATION_ID=kall-me

# Deployment environment identifier (production, staging, development)
TASKHUB_ENVIRONMENT=production

# TaskHub Central Error Reporting Configuration (optional error ingestion webhook)
TASKHUB_ERROR_REPORTING_ENABLED=false
TASKHUB_ERROR_INGESTION_URL=https://taskhub-console.example.com/api/errors/ingest
TASKHUB_ERROR_REPORTING_API_KEY=353abc7781000945e40b139ac3535976ab53cbdadf11ff5e18ebed2628b83cfe
```

### Security Guardrails
1. **Header Authentication**: Accepts the API key in the `X-API-Key` header (case-insensitive) or `Authorization: Bearer <key>`.
2. **Timing-Safe Key Verification**: Key comparison uses `crypto.createHash('sha256')` with `crypto.timingSafeEqual` to eliminate timing attacks and length leakage.
3. **API Key Rotation**: Accepts multiple comma-separated keys in `TASKHUB_INTEGRATION_API_KEY`, allowing zero-downtime rotation.
4. **HTTPS in Production**: Rejects cleartext HTTP requests in production with HTTP 403 `HTTPS_REQUIRED` (exempting local loopback testing).
5. **Rate Limiting**: Sliding-window rate limiter per client IP (120 requests/minute) preventing monitoring denial-of-service.
6. **Zero Secret Leaks**: Secrets and database passwords are redacted from log responses, error responses, and error-reporter payloads using `sanitizeErrorMessage` and `sanitizeObject`.

---

## 4. Versioned Integration Endpoints

All endpoints are mounted under `/api/integration/v1` and require an authorized API key.

| Method | Endpoint | Resource | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/integration/v1/health` | `health` | Real availability, uptime, DB ping latency, and component health |
| `GET` | `/api/integration/v1/metrics` | `metrics` | Runtime metrics: CPU, memory, disk, DB pool, scheduler, traffic snapshot |
| `GET` | `/api/integration/v1/logs` | `logs` | Unified filtered logs from PostgreSQL with pagination & phone masking |
| `GET` | `/api/integration/v1/traffic` | `traffic` | Aggregated HTTP traffic measurements by time window |
| `GET` | `/api/integration/v1/deployments`| `deployments`| Active build version, commit SHA, and release history |
| `GET` | `/api/integration/v1/diagnostics`| `diagnostics`| Restricted, read-only diagnostic checks (shell access prohibited) |
| `GET` | `/api/integration/v1/inventory`  | `inventory`  | Menu dish catalog and restaurant inventory |
| `GET` | `/api/integration/v1/billing`    | `billing`    | Real order transactions, commission, and billing statuses |
| `GET` | `/api/integration/v1/backups/health` | `backups` | Database integrity and backup vault health check |
| `GET` | `/api/integration/v1/backups/history`| `backups` | Historical database backup records and verification status |

---

## 5. Response Contract & Envelopes

Every endpoint returns the standard TaskHub JSON envelope.

### 5.1 Success Envelope
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "applicationId": "kall-me",
    "environment": "production",
    "resource": "metrics",
    "timestamp": "2026-10-18T14:03:00.000Z",
    "requestId": "2e7b8f9a-1123-4567-89ab-cdef01234567",
    "page": 1,
    "limit": 50,
    "total": 120,
    "hasMore": false,
    "nextCursor": null
  },
  "error": null
}
```

### 5.2 Error Envelope
```json
{
  "success": false,
  "data": null,
  "meta": {
    "applicationId": "kall-me",
    "environment": "production",
    "requestId": "2e7b8f9a-1123-4567-89ab-cdef01234567",
    "timestamp": "2026-10-18T14:03:00.000Z"
  },
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing or invalid integration API key.",
    "retryable": false
  }
}
```

### Common Error Codes
- `401 UNAUTHORIZED`: Missing or incorrect API key.
- `403 FORBIDDEN_RESOURCE`: Resource not in `TASKHUB_INTEGRATION_ALLOWED_RESOURCES`.
- `403 HTTPS_REQUIRED`: Cleartext HTTP request in production environment.
- `400 INVALID_QUERY_PARAMETER`: Negative page, non-integer limit, or unknown diagnostic check.
- `400 INVALID_DATE_FORMAT`: Malformed date query string.
- `400 INVALID_DATE_RANGE`: `startDate` is later than `endDate`.
- `429 RATE_LIMIT_EXCEEDED`: Client exceeded 120 requests/minute.
- `503 INTEGRATION_DISABLED`: Integration disabled via `TASKHUB_INTEGRATION_ENABLED=false`.
- `503 INTEGRATION_NOT_CONFIGURED`: Missing `TASKHUB_INTEGRATION_API_KEY` in server environment.

---

## 6. Detailed Resource Specifications

### 6.1 `GET /api/integration/v1/metrics`
Collects genuine application runtime measurements. Expensive measurements are cached in memory for 5 seconds to prevent polling thrash:
- **`application`**: Status (`healthy`/`degraded`), uptime in seconds, environment, version.
- **`process`**: PID, Node version, platform, architecture.
- **`cpu`**: User and system CPU microseconds (`process.cpuUsage`), estimated process CPU percentage. Host CPU is `null` with limitation documented.
- **`memory`**: Process RSS, heap total, heap used, external bytes. Host memory is `null` with limitation documented.
- **`disk`**: Total bytes, free bytes, used bytes, and used percentage via `fs.statfsSync`.
- **`network`**: Application HTTP throughput (requests/sec); host physical interface throughput is `null`.
- **`traffic`**: Real-time snapshot (5-minute window): request rate, average latency, p50, p95, error rate.
- **`database`**: Ping latency, PostgreSQL version, `pg.Pool` stats (`totalCount`, `idleCount`, `waitingCount`).
- **`backgroundJobs`**: Twice-weekly backup scheduler status and last executed backup metadata.
- **`deployment`**: Version, active commit SHA, deployment timestamp.

### 6.2 `GET /api/integration/v1/traffic`
Sliding-window HTTP traffic measurements collected by `trafficInstrumentationMiddleware`:
- **Query Parameters**:
  - `startDate`, `endDate`, `date`: ISO timestamp or YYYY-MM-DD boundaries.
  - `window`: Aggregation window (`1m`, `5m`, `15m`, `1h`).
  - `route`: Filter by normalized route template (e.g. `/api/menus`, `/api/orders/:id`).
  - `method`: Filter by HTTP method (`GET`, `POST`, etc.).
  - `page`, `limit`: Standard pagination.
- **Per-Bucket Metrics**: Request count, requests/second, latency percentiles (`min`, `max`, `average`, `p50`, `p95`, `p99`), status distribution (`2xx`, `3xx`, `4xx`, `5xx`), error rate, error classifications (`client_error`, `server_error`), response bytes.
- **Recursion Prevention**: All integration requests (`/api/integration/*`) bypass traffic recording, preventing monitoring loops.
- **Analytics Constraint**: Does not claim page views, user sessions, or bounce rate as client-side analytics are not integrated.

### 6.3 `GET /api/integration/v1/deployments`
Deployment and release metadata:
- **`current`**: Active version (`package.json`), commit SHA, short hash, environment, deployed at, hosting platform (`Google Cloud Functions / Firebase`), deployer.
- **`deployments`**: Recent release and git commit history with pagination (`page`, `limit`).

### 6.4 `GET /api/integration/v1/diagnostics`
Restricted, read-only diagnostic checks without remote shell exposure:
- **Query Parameters**: `operation` or `check` (`all`, `health`, `process`, `database`, `storage`, `recent_errors`, `deployment`).
- **Prohibitions**: Any request specifying shell execution or unauthorized operations returns HTTP 400 `INVALID_DIAGNOSTIC_OPERATION`.
- **Results**: Status of database ping, process metrics, disk mount accessibility, recent unhandled error counts, and security confirmation.

---

## 7. Verification & Automated Test Suite

An automated test suite is provided at `functions/test-integration-suite.js`. It runs against a temporary local HTTP server instance without needing external test servers:

```bash
cd functions
npm run test:integration
```

### Test Coverage (150 Assertions, 23 Test Cases)
1. Missing API Key (`401 Unauthorized`)
2. Invalid API Key (`401 Unauthorized`, secret not leaked)
3. Valid API Key (`200 OK`, response envelope validation)
4. Disabled Integration (`503 Service Unavailable`, `retryable: true`)
5. Missing Server Configuration (`503 Service Unavailable`)
6. Resource Permission Restriction (`403 Forbidden`)
7. Real Logs Retrieval, Field Normalization & Phone Masking (`919****96`)
8. Log Service Filtering (`service=whatsapp`, `service=backup`)
9. Real Inventory Retrieval & Category Filtering
10. Real Billing Records & Order Status Filtering
11. Backups Health & History Retrieval
12. Pagination Limits, Cursors & Stable Ordering
13. Empty Search Results Handling (`200 OK`, empty array)
14. Query Parameter Validation (`400 Bad Request` for negative pages, invalid dates, reversed date ranges)
15. API Key Rotation (Primary & secondary keys accepted, unlisted key rejected)
16. TaskHub Error Reporter (Secret & database password redaction, bounded queue)
17. TaskHub Observability Dashboard Route (`GET /api/admin/logs` with API key query param & Bearer header)
18. Existing Admin Backups Routes Coexistence
19. Runtime Metrics Endpoint (`GET /api/integration/v1/metrics`, process vs. host separation, database pool stats, CPU/memory units)
20. Traffic Telemetry Instrumentation (`GET /api/integration/v1/traffic`, sliding window, latency percentiles, error classification, recursion prevention)
21. Real Deployments Metadata & History (`GET /api/integration/v1/deployments`)
22. Restricted Read-Only Diagnostics (`GET /api/integration/v1/diagnostics`, rejection of shell execution)
23. Resource Authorization Checks for Metrics, Traffic, and Deployments
