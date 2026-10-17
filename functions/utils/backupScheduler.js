const cron = require('node-cron');
const db = require('../db');
const { createBackup, verifyBackup, isBackupInProgress, logAudit } = require('./backupService');

let activeCronTask = null;
let currentCronExpression = null;
let schedulerStatus = {
  initialized: false,
  isRunning: false,
  lastRunAt: null,
  lastRunStatus: null,
  nextRunAt: null
};

const DAY_MAP = {
  'Sunday': 0,
  'Monday': 1,
  'Tuesday': 2,
  'Wednesday': 3,
  'Thursday': 4,
  'Friday': 5,
  'Saturday': 6
};

/**
 * Build cron expression from days of week and time
 * Example: ["Wednesday", "Sunday"] and "02:00" -> "0 2 * * 0,3"
 */
function buildCronExpression(daysOfWeek, executionTime) {
  let [hours, minutes] = (executionTime || '02:00').split(':').map(Number);
  if (isNaN(hours)) hours = 2;
  if (isNaN(minutes)) minutes = 0;

  let days = [0, 3]; // Default Sunday (0) and Wednesday (3)
  if (Array.isArray(daysOfWeek) && daysOfWeek.length > 0) {
    const mapped = daysOfWeek.map(d => DAY_MAP[d]).filter(n => n !== undefined);
    if (mapped.length > 0) days = mapped;
  }

  days.sort((a, b) => a - b);
  return `${minutes} ${hours} * * ${days.join(',')}`;
}

/**
 * Calculate the next scheduled backup date and time
 */
function calculateNextRun(daysOfWeek, executionTime, timezone = 'Asia/Kolkata') {
  try {
    let [targetHours, targetMinutes] = (executionTime || '02:00').split(':').map(Number);
    if (isNaN(targetHours)) targetHours = 2;
    if (isNaN(targetMinutes)) targetMinutes = 0;

    let targetDays = [0, 3]; // Sun, Wed
    if (Array.isArray(daysOfWeek) && daysOfWeek.length > 0) {
      const mapped = daysOfWeek.map(d => DAY_MAP[d]).filter(n => n !== undefined);
      if (mapped.length > 0) targetDays = mapped;
    }

    const now = new Date();
    // Check up to 14 days ahead to find the next matching slot
    for (let dayOffset = 0; dayOffset <= 14; dayOffset++) {
      const candidate = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
      
      // Determine day of week in the target timezone
      const dayName = candidate.toLocaleDateString('en-US', { weekday: 'long', timeZone: timezone });
      const candidateDayNum = DAY_MAP[dayName];

      if (targetDays.includes(candidateDayNum)) {
        // Construct target date for candidate day in local time representation
        const y = candidate.getFullYear();
        const m = candidate.getMonth();
        const d = candidate.getDate();
        const targetDate = new Date(y, m, d, targetHours, targetMinutes, 0, 0);

        if (targetDate.getTime() > now.getTime()) {
          return targetDate.toISOString();
        }
      }
    }
  } catch (err) {
    console.warn('Error calculating next run time:', err.message);
  }

  // Fallback: 3 days from now at 02:00
  const fallback = new Date();
  fallback.setDate(fallback.getDate() + 3);
  fallback.setHours(2, 0, 0, 0);
  return fallback.toISOString();
}

/**
 * Execute automated backup job
 */
async function executeScheduledJob() {
  console.log('[Backup Scheduler] Scheduled backup triggered at', new Date().toISOString());

  if (isBackupInProgress()) {
    console.warn('[Backup Scheduler] Backup skipped: Another backup or restore operation is already in progress.');
    await logAudit('scheduled_backup_skipped', 'Automated Scheduler', {
      reason: 'Concurrent operation in progress'
    });
    return;
  }

  schedulerStatus.isRunning = true;
  try {
    const backupRecord = await createBackup({
      type: 'scheduled',
      operator: 'Automated Twice-Weekly Scheduler'
    });

    schedulerStatus.lastRunAt = new Date().toISOString();
    schedulerStatus.lastRunStatus = 'success';

    console.log('[Backup Scheduler] Successfully completed scheduled backup:', backupRecord.backup_name);

    // Auto-verify if enabled in config
    const configRes = await db.query('SELECT auto_verify_after_backup FROM backup_schedule_config WHERE id = 1');
    if (configRes.rows[0]?.auto_verify_after_backup) {
      try {
        console.log('[Backup Scheduler] Auto-verifying backup:', backupRecord.id);
        await verifyBackup(backupRecord.id);
      } catch (verifyErr) {
        console.warn('[Backup Scheduler] Auto-verify failed:', verifyErr.message);
      }
    }
  } catch (err) {
    schedulerStatus.lastRunAt = new Date().toISOString();
    schedulerStatus.lastRunStatus = 'failed';
    console.error('[Backup Scheduler] Error executing scheduled backup:', err.message);

    await logAudit('scheduled_backup_failed', 'Automated Scheduler', {
      error: err.message
    });
  } finally {
    schedulerStatus.isRunning = false;
  }
}

/**
 * Initialize or reload scheduler based on configuration in PostgreSQL
 */
async function initScheduler() {
  try {
    // 1. Fetch current schedule configuration
    const res = await db.query('SELECT * FROM backup_schedule_config WHERE id = 1');
    if (res.rows.length === 0) {
      console.warn('[Backup Scheduler] No backup_schedule_config record found.');
      return;
    }

    const config = res.rows[0];
    const {
      is_enabled,
      days_of_week,
      execution_time,
      timezone = 'Asia/Kolkata'
    } = config;

    // 2. Stop existing cron task if any
    if (activeCronTask) {
      activeCronTask.stop();
      activeCronTask = null;
      console.log('[Backup Scheduler] Stopped existing cron task.');
    }

    // 3. Compute next run time
    schedulerStatus.nextRunAt = is_enabled 
      ? calculateNextRun(days_of_week, execution_time, timezone)
      : null;

    if (!is_enabled) {
      console.log('[Backup Scheduler] Automated backups are currently DISABLED in config.');
      schedulerStatus.initialized = true;
      return;
    }

    // 4. Construct cron expression
    const cronExpression = buildCronExpression(days_of_week, execution_time);
    currentCronExpression = cronExpression;

    // 5. Schedule task
    activeCronTask = cron.schedule(
      cronExpression,
      async () => {
        await executeScheduledJob();
        // Update next run time after execution
        schedulerStatus.nextRunAt = calculateNextRun(days_of_week, execution_time, timezone);
      },
      {
        scheduled: true,
        timezone: timezone || 'Asia/Kolkata'
      }
    );

    schedulerStatus.initialized = true;
    console.log(`[Backup Scheduler] Initialized: Cron '${cronExpression}' [TZ: ${timezone}]. Next run: ${schedulerStatus.nextRunAt}`);
  } catch (err) {
    console.error('[Backup Scheduler] Failed to initialize scheduler:', err.message);
  }
}

/**
 * Reload scheduler after settings update
 */
async function reloadScheduler() {
  await initScheduler();
  return getSchedulerStatus();
}

/**
 * Get current scheduler status
 */
function getSchedulerStatus() {
  return {
    ...schedulerStatus,
    cronExpression: currentCronExpression
  };
}

module.exports = {
  initScheduler,
  reloadScheduler,
  getSchedulerStatus,
  calculateNextRun,
  buildCronExpression
};
