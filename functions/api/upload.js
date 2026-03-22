const express = require('express');
const Busboy = require('busboy');
const path = require('path');
const { bucket } = require('../firebaseAdmin');
const router = express.Router();

router.post('/', (req, res) => {
  const busboy = Busboy({ headers: req.headers });
  let fileUploaded = false;

  busboy.on('file', (name, file, info) => {
    const { filename, encoding, mimeType } = info;
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const newFileName = uniqueSuffix + path.extname(filename);
    
    const blob = bucket.file(`uploads/${newFileName}`);
    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: mimeType
      },
      resumable: false
    });

    blobStream.on('error', (err) => {
      console.error('Blob stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Upload failed', message: err.message });
      }
    });

    blobStream.on('finish', async () => {
      fileUploaded = true;
      try {
        // FIX: Removed blob.makePublic() as it crashes on Uniform Access buckets.
        // Instead, we generate a Signed URL.
        const [url] = await blob.getSignedUrl({
          action: 'read',
          expires: '03-01-2500' // Far future date
        });

        res.json({ 
          success: true,
          url: url,
          fileName: newFileName 
        });
      } catch (err) {
        console.error('Error generating URL:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Could not generate file URL' });
        }
      }
    });

    file.pipe(blobStream);
  });

  busboy.on('error', (err) => {
    console.error('Busboy error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Parsing failed' });
    }
  });

  busboy.on('finish', () => {
    // Note: If multiple files are uploaded, you might need a different 
    // counter logic, but for a single file, this works.
  });

  req.pipe(busboy);
});

module.exports = router;