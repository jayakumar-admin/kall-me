export interface BackupItem {
  id: number;
  backup_name: string;
  storage_path: string;
  backup_type: 'manual' | 'scheduled' | 'safety' | 'imported';
  status: 'success' | 'failed' | 'in_progress' | 'verifying' | 'restore_in_progress';
  backup_size_bytes: number;
  duration_ms: number;
  table_count: number;
  sha256_checksum: string;
  format_version: string;
  verification_status: 'unverified' | 'verified' | 'failed';
  verified_at?: string | null;
  restore_status?: string | null;
  restored_at?: string | null;
  error_message?: string | null;
  created_by: string;
  created_at: string;
}

export interface BackupDashboardStats {
  lastBackup: {
    hasBackup: boolean;
    backupName: string;
    createdAt: string | null;
    timezone: string;
    status: string;
    verificationStatus: string;
  };
  nextSchedule: {
    frequency: string;
    daysOfWeek: string[];
    executionTime: string;
    timezone: string;
    nextRunAt: string | null;
    description: string;
    isEnabled: boolean;
  };
  totalBackups: {
    total: number;
    retained: number;
    retentionLimit: number;
    retentionPolicyText: string;
  };
  storageUsed: {
    totalBytes: number;
    formatted: string;
    isCalculatedFromMetadata: boolean;
    storageFolder: string;
  };
  dbTables: {
    currentTableCount: number;
    tablesInLatestBackup: number;
  };
  lastSize: {
    bytes: number;
    formatted: string;
    durationMs: number;
    durationFormatted: string;
  };
  systemHealth: 'Healthy' | 'Warning' | 'Unhealthy';
}

export interface SystemCheckItem {
  status: 'healthy' | 'warning' | 'failed' | string;
  name?: string;
  message?: string;
  latencyMs?: number;
  version?: string;
  folder?: string;
  bucket?: string;
  frequency?: string;
  details?: string;
}

export interface ReferentialIntegrityItem {
  name: string;
  passed: boolean;
  status: 'passed' | 'warning' | 'failed';
  orphanCount: number;
  description: string;
  message?: string;
}

export interface HealthCheckReport {
  overallStatus: string;
  healthRating: 'Healthy' | 'Warning' | 'Unhealthy';
  checkedAt: string;
  durationMs: number;
  checks: {
    databaseConnection: SystemCheckItem;
    storageVault: SystemCheckItem;
    scheduler: SystemCheckItem;
  };
  entityCounts: {
    users?: number;
    hotels?: number;
    menus?: number;
    orders?: number;
    orderItems?: number;
    deliveryPersons?: number;
    settings?: number;
    shippingRanges?: number;
    adminCommissionConfig?: number;
    whatsappLogs?: number;
    notifications?: number;
    backupMetadata?: number;
  };
  referentialIntegrity: ReferentialIntegrityItem[];
}

export interface ScheduleConfig {
  id?: number;
  is_enabled: boolean;
  frequency: string;
  days_of_week: string[];
  execution_time: string;
  timezone: string;
  retention_count: number;
  max_backup_size_mb: number;
  storage_folder: string;
  auto_verify_after_backup: boolean;
  notification_enabled: boolean;
  nextRunAt?: string;
}
