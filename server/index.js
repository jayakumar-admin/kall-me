const express = require('express');
const path = require('path');
const cors = require('cors');
const apiRoutes = require('./api/index');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 3001; // Use 3001 for dev, 3000 for prod (if set)

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRoutes);

// Serve static files from Angular build (dist/app/browser)
const browserDistFolder = path.join(__dirname, '../dist/app/browser');
app.use(express.static(browserDistFolder));

// Serve invoices
app.use('/invoices', express.static(path.join(__dirname, '../public/invoices')));

// Handle all other requests by serving the Angular index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(browserDistFolder, 'index.html'));
});

app.listen(port, () => {
  console.log(`Node Express server listening on http://0.0.0.0:${port}`);
});
