const express = require('express');
const Busboy = require('busboy');
const path = require('path');
const { bucket } = require('../firebaseAdmin');
const router = express.Router();

router.post('/', (req, res) => {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) {
    return res.status(400).json({ error: 'Content-Type must be multipart/form-data' });
  }

  let busboy;
  try {
    busboy = Busboy({ 
      headers: req.headers,
      limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
      }
    });
  } catch (err) {
    console.error('Busboy initialization error:', err);
    return res.status(400).json({ error: 'Invalid form data headers', message: err.message });
  }

  let fileFound = false;
  let uploadPromise = null;

  busboy.on('file', (name, file, info) => {
    fileFound = true;
    const { filename, encoding, mimeType } = info;

    if (!filename) {
      file.resume();
      return;
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(filename) || '.jpg';
    const newFileName = uniqueSuffix + ext;
    
    const blob = bucket.file(`uploads/${newFileName}`);
    const blobStream = blob.createWriteStream({
      metadata: { contentType: mimeType || 'image/jpeg' },
      resumable: false
    });

    uploadPromise = new Promise((resolve, reject) => {
      blobStream.on('error', (err) => {
        console.error('Blob stream error:', err);
        reject(err);
      });

      blobStream.on('finish', async () => {
        try {
          // Generating Signed URL for Uniform Access buckets
          const [url] = await blob.getSignedUrl({
            action: 'read',
            expires: '03-01-2500'
          });

          resolve({ 
            success: true,
            url: url,
            fileName: newFileName 
          });
        } catch (err) {
          console.error('Error generating URL:', err);
          reject(err);
        }
      });

      file.pipe(blobStream);
    });
  });

  busboy.on('error', (err) => {
    console.error('Busboy error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: `Parsing failed: ${err.message}` });
    }
  });

  busboy.on('finish', async () => {
    if (!fileFound) {
      if (!res.headersSent) {
        return res.status(400).json({ error: 'No file provided in the request.' });
      }
      return;
    }

    if (uploadPromise) {
      try {
        const result = await uploadPromise;
        if (!res.headersSent) {
          return res.json(result);
        }
      } catch (err) {
        if (!res.headersSent) {
          return res.status(500).json({ error: 'Upload failed', message: err.message });
        }
      }
    }
  });

  // Handle both Firebase Functions (rawBody Buffer) and standard Express stream (req.pipe)
  if (req.rawBody) {
    busboy.end(req.rawBody);
  } else {
    req.pipe(busboy);
  }
});

module.exports = router;