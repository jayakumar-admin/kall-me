const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const functions = require('firebase-functions');
const apiRoutes = require('./api/index');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 3000; // Use 3001 for dev, 3000 for prod (if set)

app.use(cors());
app.use(express.json());

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

// Serve invoices
app.use('/invoices', express.static(path.join(__dirname, '../public/invoices')));

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
