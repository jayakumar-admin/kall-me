const admin = require('firebase-admin');
require('dotenv').config();

// Decode base64 service account from environment variable
const serviceAccountBase64 = process.env.APP_FIREBASE_SERVICE_ACCOUNT_BASE64;
if (!serviceAccountBase64 || serviceAccountBase64 === "YOUR_BASE64_ENCODED_SERVICE_ACCOUNT_JSON") {
  throw new Error('APP_FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable is not set. Please encode your service account JSON file to base64 and add it to your .env file.');
}

const serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString('ascii');
const serviceAccount = JSON.parse(serviceAccountJson);
const bucketName = process.env.APP_FIREBASE_STORAGE_BUCKET;

if (!bucketName || bucketName === "YOUR_FIREBASE_STORAGE_BUCKET") {
    throw new Error('APP_FIREBASE_STORAGE_BUCKET environment variable is not set.');
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: bucketName
});

const bucket = admin.storage().bucket();

module.exports = { bucket };