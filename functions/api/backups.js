const express = require('express');
const Busboy = require('busboy');
const path = require('path');
const db = require('../db');
const { bucket } = require('../firebaseAdmin');
const {
  createBackup,
  verifyBackup,
  restoreBackup,
  uploadBackup,
  getDashboardStats,
  runHealthCheck,
  isBackupInProgress,
  logAudit,
  formatBytes
} = require('../utils/backupService');
const {
  getSchedulerStatus,
  reloadScheduler,
  calculateNextRun
} = require('../utils/backupScheduler');

const router = express.Router();

/**
 * Optional or soft-auth extractor for operator info
 */
function getOperator(req) {
  if (req.user && req.user.username) return req.user.username;
  if (req.body && req.body.operator) return req.body.operator;
  return 'System Administrator';
}

/**
 * GET /api/admin/backups or /api/backups
 * List backups with search, type filter, and pagination
 */
router.get('/', async (req, res) => {
  try {
    const {
      search = '',
      type = 'all',
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const params = [];
    const conditions = [];

    if (search && search.trim() !== '') {
      params.push(`%${search.trim().toLowerCase()}%`);
      conditions.push(`LOWER(backup_name) LIKE $${params.length}`);
    }

    if (type && type !== 'all') {
      params.push(type.toLowerCase());
      conditions.push(`LOWER(backup_type) = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total count query
    const countSql = `SELECT COUNT(*) FROM backup_metadata ${whereClause}`;
    const countRes = await db.query(countSql, params);
    const total = parseInt(countRes.rows[0].count, 10);

    // List query
    const validSortCols = ['created_at', 'backup_name', 'backup_size_bytes', 'table_count', 'backup_type', 'status'];
    const cleanSortBy = validSortCols.includes(sortBy) ? sortBy : 'created_at';
    const cleanSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const listSql = `
      SELECT 
        id, backup_name, storage_path, backup_type, status,
        backup_size_bytes, duration_ms, table_count,
        sha256_checksum, format_version, verification_status,
        verified_at, restore_status, restored_at, error_message,
        created_by, created_at
      FROM backup_metadata
      ${whereClause}
      ORDER BY ${cleanSortBy} ${cleanSortOrder}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const listParams = [...params, parseInt(limit, 10), offset];
    const listRes = await db.query(listSql, listParams);

    res.json({
      success: true,
      backups: listRes.rows,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (err) {
    console.error('Error fetching backups list:', err);
    res.status(500).json({ error: 'Failed to fetch backups', message: err.message });
  }
});

/**
 * GET /api/admin/backups/stats
 * Dashboard summary statistics for the 6 top metric cards
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await getDashboardStats();
    const scheduler = getSchedulerStatus();

    // Include calculated next run if not already set
    if (!stats.nextSchedule.nextRun && scheduler.nextRunAt) {
      stats.nextSchedule.nextRun = scheduler.nextRunAt;
    }

    res.json({
      success: true,
      stats: {
        ...stats,
        schedulerStatus: scheduler
      }
    });
  } catch (err) {
    console.error('Error fetching backup stats:', err);
    res.status(500).json({ error: 'Failed to fetch statistics', message: err.message });
  }
});

/**
 * GET /api/admin/backups/schedule
 * Get scheduler configuration
 */
router.get('/schedule', async (req, res) => {
  try {
    const configRes = await db.query('SELECT * FROM backup_schedule_config WHERE id = 1');
    const config = configRes.rows[0] || {};
    const scheduler = getSchedulerStatus();

    res.json({
      success: true,
      config: {
        ...config,
        nextRunAt: scheduler.nextRunAt || calculateNextRun(config.days_of_week, config.execution_time, config.timezone)
      }
    });
  } catch (err) {
    console.error('Error fetching schedule config:', err);
    res.status(500).json({ error: 'Failed to fetch schedule config', message: err.message });
  }
});

/**
 * PUT /api/admin/backups/schedule
 * Update schedule configuration and reload background cron
 */
router.put('/schedule', async (req, res) => {
  try {
    const {
      is_enabled = true,
      frequency = 'twice_weekly',
      days_of_week = ['Wednesday', 'Sunday'],
      execution_time = '02:00',
      timezone = 'Asia/Kolkata',
      retention_count = 8,
      max_backup_size_mb = 500,
      storage_folder = 'db_backups/',
      auto_verify_after_backup = true,
      notification_enabled = false
    } = req.body;

    const daysJson = JSON.stringify(days_of_week);

    await db.query(
      `UPDATE backup_schedule_config
       SET 
         is_enabled = $1,
         frequency = $2,
         days_of_week = $3::jsonb,
         execution_time = $4,
         timezone = $5,
         retention_count = $6,
         max_backup_size_mb = $7,
         storage_folder = $8,
         auto_verify_after_backup = $9,
         notification_enabled = $10,
         updated_at = NOW()
       WHERE id = 1`,
      [
        is_enabled,
        frequency,
        daysJson,
        execution_time,
        timezone,
        retention_count,
        max_backup_size_mb,
        storage_folder,
        auto_verify_after_backup,
        notification_enabled
      ]
    );

    // Reload active scheduler cron
    const updatedStatus = await reloadScheduler();

    await logAudit('schedule_config_updated', getOperator(req), {
      is_enabled,
      frequency,
      days_of_week,
      execution_time,
      timezone,
      retention_count
    });

    res.json({
      success: true,
      message: 'Backup schedule configuration successfully updated.',
      scheduler: updatedStatus
    });
  } catch (err) {
    console.error('Error updating schedule config:', err);
    res.status(500).json({ error: 'Failed to update schedule config', message: err.message });
  }
});

/**
 * POST /api/admin/backups/health-check
 * Trigger read-only database health & relational integrity check
 */
router.post('/health-check', async (req, res) => {
  try {
    const report = await runHealthCheck();
    res.json({
      success: true,
      report
    });
  } catch (err) {
    console.error('Error running health check:', err);
    res.status(500).json({ error: 'Failed to execute health check', message: err.message });
  }
});

/**
 * POST /api/admin/backups
 * Trigger immediate manual backup
 */
router.post('/', async (req, res) => {
  try {
    if (isBackupInProgress()) {
      return res.status(409).json({
        error: 'Operation in progress',
        message: 'A backup or restore operation is already currently running. Please wait.'
      });
    }

    const operator = getOperator(req);
    const backupRecord = await createBackup({
      type: 'manual',
      operator
    });

    res.status(201).json({
      success: true,
      message: 'Database backup created and securely stored in Firebase Storage.',
      backup: backupRecord
    });
  } catch (err) {
    console.error('Error executing manual backup:', err);
    res.status(500).json({ error: 'Backup failed', message: err.message });
  }
});

/**
 * POST /api/admin/backups/upload
 * Handle backup ZIP upload with validation
 */
router.post('/upload', (req, res) => {
  let fileBuffer = Buffer.alloc(0);
  let fileName = 'uploaded-backup.zip';
  let operator = 'Administrator (Upload)';

  const busboy = Busboy({
    headers: req.headers,
    limits: { fileSize: 500 * 1024 * 1024 } // 500MB max
  });

  busboy.on('field', (fieldname, val) => {
    if (fieldname === 'operator') operator = val;
  });

  busboy.on('file', (fieldname, fileStream, info) => {
    const { filename } = info;
    if (filename) fileName = filename;

    const chunks = [];
    fileStream.on('data', (data) => chunks.push(data));
    fileStream.on('end', () => {
      fileBuffer = Buffer.concat(chunks);
    });
  });

  busboy.on('finish', async () => {
    try {
      if (!fileBuffer || fileBuffer.length === 0) {
        return res.status(400).json({ error: 'No backup file uploaded.' });
      }

      const backupRecord = await uploadBackup(fileBuffer, fileName, operator);
      res.status(201).json({
        success: true,
        message: 'Backup ZIP verified and registered in Firebase Storage vault.',
        backup: backupRecord
      });
    } catch (err) {
      console.error('Error processing uploaded backup:', err);
      res.status(400).json({ error: 'Backup upload rejected', message: err.message });
    }
  });

  busboy.on('error', (err) => {
    console.error('Busboy parsing error:', err);
    res.status(400).json({ error: 'Upload failed', message: err.message });
  });

  if (req.rawBody) {
    busboy.end(req.rawBody);
  } else {
    req.pipe(busboy);
  }
});

/**
 * GET /api/admin/backups/:id
 * Retrieve details of a specific backup
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM backup_metadata WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    res.json({
      success: true,
      backup: result.rows[0]
    });
  } catch (err) {
    console.error('Error fetching backup details:', err);
    res.status(500).json({ error: 'Failed to fetch backup', message: err.message });
  }
});

/**
 * GET /api/admin/backups/:id/download
 * Download backup ZIP directly from Firebase Storage
 */
router.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM backup_metadata WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    const backup = result.rows[0];
    const file = bucket.file(backup.storage_path);
    const [exists] = await file.exists();

    if (!exists) {
      return res.status(404).json({ error: 'Backup archive does not exist in Firebase Storage.' });
    }

    await logAudit('backup_downloaded', getOperator(req), {
      backupId: backup.id,
      backupName: backup.backup_name,
      sizeBytes: backup.backup_size_bytes
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${backup.backup_name}"`);
    res.setHeader('Content-Length', backup.backup_size_bytes);

    file.createReadStream().pipe(res);
  } catch (err) {
    console.error('Error downloading backup:', err);
    res.status(500).json({ error: 'Failed to download backup', message: err.message });
  }
});

/**
 * POST /api/admin/backups/:id/verify
 * Cryptographically verify SHA-256 and internal ZIP manifest
 */
router.post('/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const verification = await verifyBackup(id);

    res.json({
      success: true,
      message: verification.verified 
        ? 'Backup cryptographically verified successfully. Checksum and manifest match.'
        : 'Backup verification failed.',
      verification
    });
  } catch (err) {
    console.error('Error verifying backup:', err);
    res.status(400).json({ error: 'Verification failed', message: err.message });
  }
});

/**
 * POST /api/admin/backups/:id/restore
 * Controlled restoration with automated pre-restore safety snapshot
 */
router.post('/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;
    const { confirm } = req.body;

    if (!confirm) {
      return res.status(400).json({
        error: 'Confirmation required',
        message: 'Explicit confirmation is required to restore database. Existing data will be replaced.'
      });
    }

    if (isBackupInProgress()) {
      return res.status(409).json({
        error: 'Operation in progress',
        message: 'Another backup or restore operation is already currently active.'
      });
    }

    const operator = getOperator(req);
    const restoreResult = await restoreBackup(id, operator);

    res.json({
      success: true,
      message: restoreResult.message,
      result: restoreResult
    });
  } catch (err) {
    console.error('Error executing database restore:', err);
    res.status(500).json({ error: 'Restore failed', message: err.message });
  }
});

/**
 * DELETE /api/admin/backups/:id
 * Delete backup from Firebase Storage and metadata
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM backup_metadata WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    const backup = result.rows[0];

    // Delete from Firebase Storage
    try {
      const file = bucket.file(backup.storage_path);
      const [exists] = await file.exists();
      if (exists) {
        await file.delete();
      }
    } catch (storageErr) {
      console.warn('Storage deletion error:', storageErr.message);
    }

    // Delete DB record
    await db.query('DELETE FROM backup_metadata WHERE id = $1', [id]);

    await logAudit('backup_deleted', getOperator(req), {
      backupId: backup.id,
      backupName: backup.backup_name
    });

    res.json({
      success: true,
      message: `Backup ${backup.backup_name} deleted successfully.`
    });
  } catch (err) {
    console.error('Error deleting backup:', err);
    res.status(500).json({ error: 'Failed to delete backup', message: err.message });
  }
});

module.exports = router;
