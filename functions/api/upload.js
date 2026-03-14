const express = require('express');
const Busboy = require('busboy');
const path = require('path');
const { bucket } = require('../firebase');
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
        res.status(500).json({ error: 'Upload failed' });
      }
    });

    blobStream.on('finish', async () => {
      fileUploaded = true;
      // Make the file public or get a signed URL
      // For simplicity in this environment, we'll use the public URL if the bucket allows it
      // or generate a signed URL with a long expiration.
      try {
        await blob.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
        res.json({ url: publicUrl });
      } catch (err) {
        console.error('Error making file public:', err);
        // Fallback to signed URL if makePublic fails (e.g. due to bucket permissions)
        const [url] = await blob.getSignedUrl({
          action: 'read',
          expires: '03-01-2500'
        });
        res.json({ url });
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
    if (!fileUploaded && !res.headersSent) {
      res.status(400).json({ error: 'No file uploaded' });
    }
  });

  req.pipe(busboy);
});

module.exports = router;

