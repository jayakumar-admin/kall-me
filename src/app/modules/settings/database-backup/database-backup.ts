import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { BackupService } from '../../../services/backup.service';
import { ToastService } from '../../../services/toast.service';
import {
  BackupItem,
  BackupDashboardStats,
  HealthCheckReport,
  ScheduleConfig
} from '../../../models/backup.model';

@Component({
  selector: 'app-database-backup',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './database-backup.html',
  styleUrls: ['./database-backup.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DatabaseBackupComponent implements OnInit {
  private backupService = inject(BackupService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  // Dashboard Stats & State
  stats: BackupDashboardStats | null = null;
  backups: BackupItem[] = [];
  isLoading = false;
  isBackingUp = false;
  isHealthChecking = false;
  isRestoring = false;
  isVerifying: { [key: number]: boolean } = {};
  isUploading = false;

  // Search & Filter
  searchQuery = '';
  selectedFilter: 'all' | 'manual' | 'scheduled' | 'safety' = 'all';
  currentPage = 1;
  pageSize = 15;
  totalPages = 1;
  totalItems = 0;

  // Modals State
  showHealthModal = false;
  healthReport: HealthCheckReport | null = null;

  showRestoreModal = false;
  selectedBackupForRestore: BackupItem | null = null;
  restoreConfirmed = false;
  restoreResult: any = null;

  showUploadModal = false;
  selectedFile: File | null = null;
  uploadOperator = 'Administrator';
  uploadDragOver = false;

  showScheduleModal = false;
  scheduleConfig: ScheduleConfig = {
    is_enabled: true,
    frequency: 'twice_weekly',
    days_of_week: ['Wednesday', 'Sunday'],
    execution_time: '02:00',
    timezone: 'Asia/Kolkata',
    retention_count: 8,
    max_backup_size_mb: 500,
    storage_folder: 'db_backups/',
    auto_verify_after_backup: true,
    notification_enabled: false
  };

  showDetailsModal = false;
  selectedBackupDetails: BackupItem | null = null;

  availableDays = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday'
  ];

  get dbVersion(): string {
    return this.healthReport?.checks?.databaseConnection?.version || 'PostgreSQL 18.x';
  }

  get dbLatency(): number {
    return this.healthReport?.checks?.databaseConnection?.latencyMs || 0;
  }

  get storageVaultFolder(): string {
    return this.healthReport?.checks?.storageVault?.folder || 'db_backups/';
  }

  ngOnInit(): void {
    this.refreshAll();
  }

  refreshAll(): void {
    this.loadStats();
    this.loadBackups();
  }

  loadStats(): void {
    this.backupService.getDashboardStats().subscribe({
      next: (res) => {
        if (res.success && res.stats) {
          this.stats = res.stats;
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        console.warn('Failed loading backup dashboard stats:', err);
      }
    });
  }

  loadBackups(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.backupService.getBackups({
      search: this.searchQuery,
      type: this.selectedFilter,
      page: this.currentPage,
      limit: this.pageSize
    }).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success) {
          this.backups = res.backups || [];
          this.totalItems = res.pagination?.total || 0;
          this.totalPages = res.pagination?.totalPages || 1;
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isLoading = false;
        this.toast.error('Failed to load backup snapshots: ' + (err.error?.message || err.message));
        this.cdr.markForCheck();
      }
    });
  }

  onFilterChange(filter: 'all' | 'manual' | 'scheduled' | 'safety'): void {
    this.selectedFilter = filter;
    this.currentPage = 1;
    this.loadBackups();
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.loadBackups();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadBackups();
    }
  }

  // --- Actions ---

  triggerBackupNow(): void {
    if (this.isBackingUp) return;

    this.isBackingUp = true;
    this.toast.info('Initiating PostgreSQL database backup snapshot...');
    this.cdr.markForCheck();

    this.backupService.createManualBackup().subscribe({
      next: (res) => {
        this.isBackingUp = false;
        this.toast.success(res.message || 'Database snapshot created and uploaded to Firebase Storage.');
        this.refreshAll();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isBackingUp = false;
        this.toast.error('Backup creation failed: ' + (err.error?.message || err.message));
        this.cdr.markForCheck();
      }
    });
  }

  verifyBackup(backup: BackupItem): void {
    if (this.isVerifying[backup.id]) return;

    this.isVerifying[backup.id] = true;
    this.toast.info(`Cryptographically verifying ${backup.backup_name}...`);
    this.cdr.markForCheck();

    this.backupService.verifyBackup(backup.id).subscribe({
      next: (res) => {
        this.isVerifying[backup.id] = false;
        if (res.verification?.verified) {
          this.toast.success(`Verified: SHA-256 and manifest matched perfectly.`);
        } else {
          this.toast.error(`Verification warning: SHA-256 or structure did not match.`);
        }
        this.loadBackups();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isVerifying[backup.id] = false;
        this.toast.error('Verification failed: ' + (err.error?.message || err.message));
        this.loadBackups();
        this.cdr.markForCheck();
      }
    });
  }

  downloadBackup(backup: BackupItem): void {
    this.toast.info(`Preparing secure download for ${backup.backup_name}...`);
    this.backupService.downloadBackup(backup.id, backup.backup_name);
  }

  openRestoreModal(backup: BackupItem): void {
    this.selectedBackupForRestore = backup;
    this.restoreConfirmed = false;
    this.restoreResult = null;
    this.showRestoreModal = true;
    this.cdr.markForCheck();
  }

  closeRestoreModal(): void {
    if (this.isRestoring) return;
    this.showRestoreModal = false;
    this.selectedBackupForRestore = null;
    this.restoreConfirmed = false;
    this.restoreResult = null;
    this.cdr.markForCheck();
  }

  executeRestore(): void {
    if (!this.selectedBackupForRestore || !this.restoreConfirmed || this.isRestoring) return;

    this.isRestoring = true;
    this.toast.info('Executing controlled restoration. Creating pre-restore safety snapshot...');
    this.cdr.markForCheck();

    this.backupService.restoreBackup(this.selectedBackupForRestore.id, true).subscribe({
      next: (res) => {
        this.isRestoring = false;
        this.restoreResult = res;
        this.toast.success(res.message || 'Database successfully restored!');
        this.refreshAll();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isRestoring = false;
        this.toast.error('Restoration failed: ' + (err.error?.message || err.message));
        this.cdr.markForCheck();
      }
    });
  }

  openHealthModal(): void {
    this.showHealthModal = true;
    this.runHealthCheck();
  }

  closeHealthModal(): void {
    this.showHealthModal = false;
    this.cdr.markForCheck();
  }

  runHealthCheck(): void {
    this.isHealthChecking = true;
    this.cdr.markForCheck();

    this.backupService.runHealthCheck().subscribe({
      next: (res) => {
        this.isHealthChecking = false;
        if (res.success && res.report) {
          this.healthReport = res.report;
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isHealthChecking = false;
        this.toast.error('Health check failed: ' + (err.error?.message || err.message));
        this.cdr.markForCheck();
      }
    });
  }

  // --- Upload Modal ---

  openUploadModal(): void {
    this.selectedFile = null;
    this.uploadOperator = 'System Administrator';
    this.showUploadModal = true;
    this.cdr.markForCheck();
  }

  closeUploadModal(): void {
    if (this.isUploading) return;
    this.showUploadModal = false;
    this.selectedFile = null;
    this.cdr.markForCheck();
  }

  onFileDropped(event: DragEvent): void {
    event.preventDefault();
    this.uploadDragOver = false;
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.handleFileSelected(event.dataTransfer.files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFileSelected(input.files[0]);
    }
  }

  private handleFileSelected(file: File): void {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      this.toast.error('Invalid file format. Please upload a .zip backup archive.');
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      this.toast.error('File size exceeds the 500MB maximum limit.');
      return;
    }
    this.selectedFile = file;
    this.cdr.markForCheck();
  }

  submitUpload(): void {
    if (!this.selectedFile || this.isUploading) return;

    this.isUploading = true;
    this.toast.info('Verifying and uploading backup ZIP to Firebase Storage...');
    this.cdr.markForCheck();

    const formData = new FormData();
    formData.append('backup', this.selectedFile, this.selectedFile.name);
    formData.append('operator', this.uploadOperator || 'Administrator');

    this.backupService.uploadBackup(formData).subscribe({
      next: (res) => {
        this.isUploading = false;
        this.toast.success(res.message || 'Backup successfully uploaded and verified!');
        this.closeUploadModal();
        this.refreshAll();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isUploading = false;
        this.toast.error('Upload rejected: ' + (err.error?.message || err.message));
        this.cdr.markForCheck();
      }
    });
  }

  // --- Schedule Modal ---

  openScheduleModal(): void {
    this.backupService.getScheduleConfig().subscribe({
      next: (res) => {
        if (res.success && res.config) {
          this.scheduleConfig = {
            ...res.config,
            days_of_week: Array.isArray(res.config.days_of_week) 
              ? res.config.days_of_week 
              : ['Wednesday', 'Sunday']
          };
        }
        this.showScheduleModal = true;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.toast.error('Failed to load schedule settings: ' + (err.error?.message || err.message));
        this.showScheduleModal = true;
        this.cdr.markForCheck();
      }
    });
  }

  closeScheduleModal(): void {
    this.showScheduleModal = false;
    this.cdr.markForCheck();
  }

  toggleDay(day: string): void {
    const idx = this.scheduleConfig.days_of_week.indexOf(day);
    if (idx > -1) {
      if (this.scheduleConfig.days_of_week.length > 1) {
        this.scheduleConfig.days_of_week.splice(idx, 1);
      } else {
        this.toast.error('At least one backup day must remain selected.');
      }
    } else {
      this.scheduleConfig.days_of_week.push(day);
    }
    this.cdr.markForCheck();
  }

  saveSchedule(): void {
    this.backupService.updateScheduleConfig(this.scheduleConfig).subscribe({
      next: (res) => {
        this.toast.success(res.message || 'Backup schedule updated successfully.');
        this.closeScheduleModal();
        this.refreshAll();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.toast.error('Failed to update schedule: ' + (err.error?.message || err.message));
        this.cdr.markForCheck();
      }
    });
  }

  // --- Details Modal ---

  openDetailsModal(backup: BackupItem): void {
    this.selectedBackupDetails = backup;
    this.showDetailsModal = true;
    this.cdr.markForCheck();
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedBackupDetails = null;
    this.cdr.markForCheck();
  }

  // --- Helpers ---

  copyToClipboard(text: string, label = 'Checksum'): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.toast.success(`${label} copied to clipboard!`);
      });
    } else {
      this.toast.info(`${label}: ${text}`);
    }
  }

  formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDuration(ms: number): string {
    if (!ms || ms === 0) return '0ms';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }
}
