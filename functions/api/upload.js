const express = require('express');
const Busboy = require('busboy');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { randomUUID } = require('crypto');
const { authMiddleware, adminOnly, softAuthMiddleware } = require('../authMiddleware');
const { bucket } = require('../firebaseAdmin');

const router = express.Router();

// @route   POST /api/upload
// @desc    Upload an image to Firebase Storage. Compatible with both local Express and Firebase Functions.
// @access  Public (Restricted paths for non-admins)
router.post('/', softAuthMiddleware, (req, res) => {
  // We use Busboy to handle multipart form data. This approach is compatible with both
  // standard Express environments (local development) and Firebase Cloud Functions.
  const busboy = Busboy({
    headers: req.headers,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
  });

  const tmpdir = os.tmpdir();
  const fields = {};
  const uploads = {};
  let uploadError = null;

  busboy.on('field', (fieldname, val) => {
    fields[fieldname] = val;
  });

  busboy.on('file', (fieldname, file, info) => {
    const { filename, mimeType } = info;

    // File validation
    const allowedMimeTypes = /jpeg|jpg|png|gif|webp/;
    if (!allowedMimeTypes.test(mimeType)) {
      uploadError = `Invalid file type: ${mimeType}. Only images are allowed.`;
      file.resume(); // Consume the stream to prevent hanging
      return;
    }

    // Give file a unique name to prevent collisions in the temp directory
    const uniqueFilename = `${randomUUID()}-${filename}`;
    const filepath = path.join(tmpdir, uniqueFilename);
    uploads[fieldname] = { filepath, mimeType };

    const writeStream = fs.createWriteStream(filepath);
    file.pipe(writeStream);

    file.on('limit', () => {
      uploadError = 'File size limit reached (5MB).';
      // Unpipe and delete the partially written file
      file.unpipe(writeStream);
      fs.unlink(filepath, () => {});
    });
  });

  busboy.on('finish', async () => {
    if (uploadError) {
      // Clean up any files that might have been created
      Object.values(uploads).forEach((fileInfo) => {
        if (fs.existsSync(fileInfo.filepath)) {
          fs.unlinkSync(fileInfo.filepath);
        }
      });
      return res.status(400).json({ message: uploadError });
    }

    const fileToWrite = uploads['image']; // 'image' is the field name from the frontend
    if (!fileToWrite) {
      return res.status(400).json({ message: 'No file uploaded or file was invalid.' });
    }

    const destinationPath = fields.path || 'general';

    // Security check: restrict paths for non-admins
    const isAdmin = req.user && req.user.role === 'admin';
    const allowedGuestPaths = ['products', 'reviews', 'customizations', 'avatars'];

    if (!isAdmin && !allowedGuestPaths.includes(destinationPath)) {
      // Clean up temp file
      if (fs.existsSync(fileToWrite.filepath)) {
        fs.unlinkSync(fileToWrite.filepath);
      }
      return res.status(403).json({ message: 'Forbidden: You do not have permission to upload to this path.' });
    }

    const uniqueFilenameForStorage = `${randomUUID()}${path.extname(fileToWrite.filepath)}`;
    const gcsPath = `${destinationPath}/${uniqueFilenameForStorage}`;

    try {
      // Upload the temporary file from disk to Firebase Storage
      await bucket.upload(fileToWrite.filepath, {
        destination: gcsPath,
        metadata: {
          contentType: fileToWrite.mimeType,
        },
      });

      // The file is automatically public if the bucket has uniform public access.
      // The .makePublic() call is not needed and causes an error with this bucket configuration.

      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${gcsPath}`;
      res.json({ url: publicUrl });
    } catch (error) {
      console.error('Firebase upload failed:', error);
      res.status(500).json({ message: 'Error uploading to Firebase Storage.' });
    } finally {
      // Always clean up the temporary file after we're done with it
      if (fs.existsSync(fileToWrite.filepath)) {
        fs.unlinkSync(fileToWrite.filepath);
      }
    }
  });

  // In Firebase Cloud Functions, the raw body is available in `req.rawBody`.
  // In a standard Express server, we need to pipe the request stream (`req`).
  // This conditional logic handles both environments.
  if (req.rawBody) {
    busboy.end(req.rawBody);
  } else {
    req.pipe(busboy);
  }
});

// @route   DELETE /api/upload
// @desc    Delete an image from Firebase Storage using its URL
// @access  Private (Admin only)
router.delete('/', authMiddleware, adminOnly, async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ message: 'File URL is required.' });
  }

  try {
    const urlParts = new URL(url);
    // The pathname is like /bucket-name/folder/file.jpg
    // We need to remove the leading slash and bucket name to get the file path.
    const gcsPath = urlParts.pathname.substring(1).replace(`${bucket.name}/`, '');

    if (!gcsPath) {
      throw new Error('Could not parse file path from URL.');
    }

    await bucket.file(gcsPath).delete();
    res.status(204).send();
  } catch (error) {
    if (error.code === 404) {
      console.warn(`Attempted to delete non-existent file from Firebase: ${url}`);
      return res.status(204).send(); // Still success if file doesn't exist
    }
    console.error('Error deleting file from Firebase:', error);
    return res.status(500).json({ message: 'Error deleting file.' });
  }
});

module.exports = router;
