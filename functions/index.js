const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const functions = require('firebase-functions');
const cookieParser = require('cookie-parser');
const db = require('./db');
const apiRoutes = require('./api/index.js');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 3000; // Use 3001 for dev, 3000 for prod (if set)

// Initialize schema
try {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.query(schema).then(() => {
    console.log('Database schema initialized');
    // Run additional migrations
    return db.query(`
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
    `);
  })
  .then(() => console.log('Database migrations completed'))
  .catch(console.error);
} catch (e) {
  console.error('Error reading schema.sql', e);
}

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// API Routes
app.use('/api', apiRoutes);

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
