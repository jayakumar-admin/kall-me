const crypto = require('crypto');
const db = require('./db');
const { bucket } = require('./firebaseAdmin');
const {
  createBackup,
  verifyBackup,
  restoreBackup,
  getDashboardStats,
  runHealthCheck,
  formatBytes,
  formatDuration
} = require('./utils/backupService');
const {
  calculateNextRun,
  buildCronExpression,
  getSchedulerStatus
} = require('./utils/backupScheduler');

async function runTestSuite() {
  console.log('====================================================');
  console.log('  KALL MEE DATABASE BACKUP & RECOVERY TEST SUITE    ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // TEST 1: Cron Expression Generation
  console.log('--- TEST 1: Cron Expression Generation ---');
  const cronTwiceWeekly = buildCronExpression(['Wednesday', 'Sunday'], '02:00');
  assert(cronTwiceWeekly === '0 2 * * 0,3', `Twice weekly cron expression matches '0 2 * * 0,3' (got: ${cronTwiceWeekly})`);

  const cronDaily = buildCronExpression(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], '03:30');
  assert(cronDaily === '30 3 * * 0,1,2,3,4,5,6', `Daily cron expression matches (got: ${cronDaily})`);

  // TEST 2: Schedule Calculation (Next Run Time)
  console.log('\n--- TEST 2: Schedule Calculation (Next Run Time) ---');
  const nextRun = calculateNextRun(['Wednesday', 'Sunday'], '02:00', 'Asia/Kolkata');
  assert(typeof nextRun === 'string' && nextRun.length > 0, `Next run time calculated successfully: ${nextRun}`);
  const nextRunDate = new Date(nextRun);
  assert(nextRunDate.getTime() > Date.now(), 'Next run time is in the future');

  // TEST 3: Health Check & Referential Integrity
  console.log('\n--- TEST 3: Health Check & Referential Integrity ---');
  const health = await runHealthCheck();
  assert(health.overallStatus.includes('DATABASE SYSTEM'), `Health status reported: ${health.overallStatus}`);
  assert(health.checks.databaseConnection.status === 'healthy', 'PostgreSQL database connectivity check passed');
  assert(health.checks.storageVault.status === 'healthy', 'Firebase Storage vault check passed');
  assert(Array.isArray(health.referentialIntegrity) && health.referentialIntegrity.length > 0, `Referential integrity checks verified (${health.referentialIntegrity.length} checks)`);

  // TEST 4: Create Manual Backup Snapshot
  console.log('\n--- TEST 4: Create Manual Backup Snapshot ---');
  const backup = await createBackup({
    type: 'manual',
    operator: 'Automated Test Runner'
  });
  assert(backup && backup.id, `Backup created with ID #${backup.id}`);
  assert(backup.backup_name.startsWith('kallmee-db-backup-'), `Backup filename follows convention: ${backup.backup_name}`);
  assert(backup.backup_size_bytes > 0, `Backup archive size is non-zero (${formatBytes(backup.backup_size_bytes)})`);
  assert(backup.sha256_checksum && backup.sha256_checksum.length === 64, `SHA-256 checksum generated (${backup.sha256_checksum.slice(0, 16)}...)`);

  // TEST 5: Verify Archive in Firebase Storage
  console.log('\n--- TEST 5: Verify Archive in Firebase Storage ---');
  const file = bucket.file(backup.storage_path);
  const [exists] = await file.exists();
  assert(exists === true, `File exists in Firebase Storage at ${backup.storage_path}`);

  // TEST 6: Cryptographic Verification
  console.log('\n--- TEST 6: Cryptographic Verification ---');
  const verification = await verifyBackup(backup.id);
  assert(verification.verified === true, 'Backup verification returned verified=true');
  assert(verification.checksumMatches === true, 'Computed SHA-256 matches stored checksum exactly');
  assert(verification.manifestValid === true, 'Manifest JSON validated inside ZIP');

  // TEST 7: Dashboard Summary Statistics
  console.log('\n--- TEST 7: Dashboard Summary Statistics ---');
  const stats = await getDashboardStats();
  assert(stats.lastBackup.hasBackup === true, 'Dashboard shows last backup exists');
  assert(stats.totalBackups.total > 0, `Total backups reported: ${stats.totalBackups.total}`);
  assert(stats.storageUsed.totalBytes > 0, `Storage used reported: ${stats.storageUsed.formatted}`);
  assert(stats.dbTables.currentTableCount > 0, `Table count reported: ${stats.dbTables.currentTableCount}`);

  // TEST 8: Safe Restore Workflow with Safety Pre-Restore Snapshot
  console.log('\n--- TEST 8: Safe Restore Workflow with Pre-Restore Snapshot ---');
  const countBefore = (await db.query('SELECT COUNT(*) FROM backup_metadata')).rows[0].count;
  const restoreResult = await restoreBackup(backup.id, 'Automated Test Operator');
  assert(restoreResult.success === true, `Restore operation completed successfully: ${restoreResult.message}`);
  assert(typeof restoreResult.safetyBackupName === 'string' && restoreResult.safetyBackupName.includes('safety'), `Safety pre-restore backup created: ${restoreResult.safetyBackupName}`);

  const countAfter = (await db.query('SELECT COUNT(*) FROM backup_metadata')).rows[0].count;
  assert(parseInt(countAfter, 10) > parseInt(countBefore, 10), `Safety backup was registered in metadata (count: ${countBefore} -> ${countAfter})`);

  console.log('\n====================================================');
  console.log(`TEST SUITE FINISHED: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
