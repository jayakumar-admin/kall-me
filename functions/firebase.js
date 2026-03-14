const admin = require('firebase-admin');
const path = require('path');
const firebaseConfig = require('../firebase-applet-config.json');

// Initialize Firebase Admin
// In this environment, the credentials are automatically handled if running on GCP
// or we can use the projectId from the config.
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket
  });
}

const db = admin.firestore();
const storage = admin.storage();
const bucket = storage.bucket();

module.exports = { admin, db, storage, bucket };
