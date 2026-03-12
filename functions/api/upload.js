const express = require('express');
const busboy = require('busboy');
const admin = require('firebase-admin');
const router = express.Router();

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) 
      : undefined;
      
    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });
    } else {
      console.warn('FIREBASE_SERVICE_ACCOUNT not provided. Uploads will fail.');
    }
  } catch (e) {
    console.error('Failed to initialize Firebase Admin:', e);
  }
}

router.post('/', (req, res) => {
  if (!admin.apps.length) {
    // Mock response for development if Firebase is not configured
    console.warn('Firebase not configured, returning mock URL');
    res.json({ url: `https://picsum.photos/seed/${Date.now()}/400/300` });
    return;
  }

  const bb = busboy({ headers: req.headers });
  let uploadPromise = null;

  bb.on('file', (name, file, info) => {
    const { filename, mimeType } = info;
    const bucket = admin.storage().bucket();
    const fileRef = bucket.file(`uploads/${Date.now()}-${filename}`);
    
    uploadPromise = new Promise((resolve, reject) => {
      const stream = fileRef.createWriteStream({
        metadata: { contentType: mimeType }
      });
      
      file.pipe(stream)
        .on('error', reject)
        .on('finish', async () => {
          try {
            const [url] = await fileRef.getSignedUrl({
              action: 'read',
              expires: '03-01-2500'
            });
            resolve(url);
          } catch (err) {
            reject(err);
          }
        });
    });
  });

  bb.on('close', async () => {
    if (uploadPromise) {
      try {
        const url = await uploadPromise;
        res.json({ url });
      } catch (e) {
        console.error('Upload error:', e);
        res.status(500).json({ error: 'Upload failed' });
      }
    } else {
      res.status(400).json({ error: 'No file uploaded' });
    }
  });

  req.pipe(bb);
});

module.exports = router;
