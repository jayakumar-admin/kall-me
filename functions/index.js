const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const functions = require('firebase-functions');
const cookieParser = require('cookie-parser');
const db = require('./db');
const apiRoutes = require('./api/index.js');
const { taskhubErrorHandler } = require('./utils/taskhubErrorReporter');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 3000; // Use 3001 for dev, 3000 for prod (if set)

// Initialize schema and migrations
try {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.query(schema)
    .then(() => {
      console.log('Database schema initialized');
    })
    .catch((err) => {
      console.log('Database schema initialized (seed keys might already exist):', err.message);
    })
    .finally(() => {
      // ALWAYS run the code-required migrations to update missing columns like phone on hotels
      db.query(`
        ALTER TABLE orders 
        ADD COLUMN IF NOT EXISTS commission_calculation_type VARCHAR(20) DEFAULT 'percentage';
        ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS shipping_calculation_type VARCHAR(20) DEFAULT 'fixed';
        ALTER TABLE shipping_ranges
        ADD COLUMN IF NOT EXISTS calculation_type VARCHAR(20) DEFAULT 'fixed';
        ALTER TABLE admin_commission_config
        ADD COLUMN IF NOT EXISTS calculation_type VARCHAR(20) DEFAULT 'percentage';
        ALTER TABLE delivery_persons
        ADD COLUMN IF NOT EXISTS image_url TEXT;
        ALTER TABLE delivery_persons
        ADD COLUMN IF NOT EXISTS vehicle_number VARCHAR(100);
        ALTER TABLE delivery_persons
        ADD COLUMN IF NOT EXISTS license_number VARCHAR(100);
        ALTER TABLE hotels
        ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
        ALTER TABLE hotels
        ADD COLUMN IF NOT EXISTS order_sequence INTEGER;

        CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
        CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_orders_hotel_id ON orders(hotel_id);
        CREATE INDEX IF NOT EXISTS idx_orders_delivery_person_id ON orders(delivery_person_id);

        CREATE TABLE IF NOT EXISTS backup_metadata (
            id SERIAL PRIMARY KEY,
            backup_name VARCHAR(255) NOT NULL UNIQUE,
            storage_path TEXT NOT NULL,
            backup_type VARCHAR(50) DEFAULT 'manual',
            status VARCHAR(50) DEFAULT 'success',
            backup_size_bytes BIGINT DEFAULT 0,
            duration_ms INTEGER DEFAULT 0,
            table_count INTEGER DEFAULT 0,
            sha256_checksum VARCHAR(64),
            format_version VARCHAR(20) DEFAULT 'v1.0',
            manifest_json JSONB,
            verification_status VARCHAR(50) DEFAULT 'unverified',
            verified_at TIMESTAMP,
            restore_status VARCHAR(50),
            restored_at TIMESTAMP,
            error_message TEXT,
            created_by VARCHAR(255) DEFAULT 'System Administrator',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS backup_schedule_config (
            id SERIAL PRIMARY KEY,
            is_enabled BOOLEAN DEFAULT TRUE,
            frequency VARCHAR(50) DEFAULT 'twice_weekly',
            days_of_week JSONB DEFAULT '["Wednesday", "Sunday"]'::jsonb,
            execution_time VARCHAR(10) DEFAULT '02:00',
            timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
            retention_count INTEGER DEFAULT 8,
            max_backup_size_mb INTEGER DEFAULT 500,
            storage_folder VARCHAR(255) DEFAULT 'db_backups/',
            auto_verify_after_backup BOOLEAN DEFAULT TRUE,
            notification_enabled BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS backup_audit_logs (
            id SERIAL PRIMARY KEY,
            action VARCHAR(100) NOT NULL,
            operator VARCHAR(255),
            details JSONB,
            status VARCHAR(20) DEFAULT 'success',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        INSERT INTO backup_schedule_config (id, is_enabled, frequency, days_of_week, execution_time, timezone, retention_count, storage_folder)
        VALUES (1, TRUE, 'twice_weekly', '["Wednesday", "Sunday"]'::jsonb, '02:00', 'Asia/Kolkata', 8, 'db_backups/')
        ON CONFLICT (id) DO NOTHING;
      `)
      .then(() => {
        console.log('Database migrations completed successfully');
        try {
          const { initScheduler } = require('./utils/backupScheduler');
          initScheduler();
        } catch (schedErr) {
          console.warn('Backup scheduler init deferred:', schedErr.message);
        }
      })
      .catch((err) => console.error('Error running database migrations:', err));
    });
} catch (e) {
  console.error('Error reading schema.sql', e);
}

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Non-intrusive traffic telemetry instrumentation
const { trafficInstrumentationMiddleware } = require('./services/trafficMetricsService');
app.use(trafficInstrumentationMiddleware);

// API Routes (mount at /api as well as / for direct Cloud Function execution)
app.use('/api', apiRoutes);
app.use('/', apiRoutes);

// Serve static files from Angular build (dist/app/browser)
const browserDistFolder = path.join(__dirname, '../dist/app/browser');
const browserIndexHtml = path.join(browserDistFolder, 'index.html');
const hasBrowserBuild = fs.existsSync(browserIndexHtml);

if (hasBrowserBuild) {
app.use(express.static(browserDistFolder));
} else {
  console.warn(
    `WARNING: Angular build not found at ${browserIndexHtml}. Run 'npm run build' from the repo root to generate it.`
  );
}

// Serve invoices and uploads
app.use('/invoices', express.static(path.join(__dirname, '../public/invoices')));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Handle all other requests by serving the Angular index.html (if available)
// Use a regex route to avoid path-to-regexp parsing issues for simple catch-all.
app.get(/.*/, (req, res) => {
  if (hasBrowserBuild) {
    return res.sendFile(browserIndexHtml);
  }

  res.status(404).send(
    `Angular build not found (expected ${browserIndexHtml}). Run 'npm run build' from the repo root.`
  );
});

// Centralized error handling and TaskHub reporting middleware
app.use(taskhubErrorHandler);

// Export as a Cloud Function
exports.api = functions.https.onRequest(app);


// Export the Express app for local development / testing
exports.app = app;

// Start the server if not running as a function
if (require.main === module) {
  const serverPort = 3001;
  app.listen(serverPort, '0.0.0.0', () => {
    console.log(`Backend server running on http://0.0.0.0:${serverPort}`);
  });
}
