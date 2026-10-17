import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { ApiService } from './api.service';
import {
  BackupItem,
  BackupDashboardStats,
  HealthCheckReport,
  ScheduleConfig
} from '../models/backup.model';

export interface BackupsResponse {
  success: boolean;
  backups: BackupItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class BackupService {
  private http = inject(HttpClient);
  private api = inject(ApiService);

  private get baseUrl(): string {
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      return 'http://localhost:3000/api/admin/backups';
    }
    return `${this.api.baseUrl}/admin/backups`;
  }

  private get<T>(endpoint: string, params?: HttpParams): Observable<T> {
    const primaryUrl = `${this.baseUrl}${endpoint}`;
    const fallbackUrl = `${this.api.baseUrl}/admin/backups${endpoint}`;

    return this.http.get<T>(primaryUrl, { params }).pipe(
      catchError((primaryErr) => {
        if (primaryUrl !== fallbackUrl) {
          return this.http.get<T>(fallbackUrl, { params });
        }
        return throwError(() => primaryErr);
      })
    );
  }

  private post<T>(endpoint: string, body: any): Observable<T> {
    const primaryUrl = `${this.baseUrl}${endpoint}`;
    const fallbackUrl = `${this.api.baseUrl}/admin/backups${endpoint}`;

    return this.http.post<T>(primaryUrl, body).pipe(
      catchError((primaryErr) => {
        if (primaryUrl !== fallbackUrl) {
          return this.http.post<T>(fallbackUrl, body);
        }
        return throwError(() => primaryErr);
      })
    );
  }

  private put<T>(endpoint: string, body: any): Observable<T> {
    const primaryUrl = `${this.baseUrl}${endpoint}`;
    const fallbackUrl = `${this.api.baseUrl}/admin/backups${endpoint}`;

    return this.http.put<T>(primaryUrl, body).pipe(
      catchError((primaryErr) => {
        if (primaryUrl !== fallbackUrl) {
          return this.http.put<T>(fallbackUrl, body);
        }
        return throwError(() => primaryErr);
      })
    );
  }

  private deleteReq<T>(endpoint: string): Observable<T> {
    const primaryUrl = `${this.baseUrl}${endpoint}`;
    const fallbackUrl = `${this.api.baseUrl}/admin/backups${endpoint}`;

    return this.http.delete<T>(primaryUrl).pipe(
      catchError((primaryErr) => {
        if (primaryUrl !== fallbackUrl) {
          return this.http.delete<T>(fallbackUrl);
        }
        return throwError(() => primaryErr);
      })
    );
  }

  /**
   * List backups with optional search, type filter, sorting, and pagination
   */
  getBackups(params: {
    search?: string;
    type?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  } = {}): Observable<BackupsResponse> {
    let httpParams = new HttpParams();
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.type && params.type !== 'all') httpParams = httpParams.set('type', params.type);
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.sortOrder) httpParams = httpParams.set('sortOrder', params.sortOrder);

    return this.get<BackupsResponse>('', httpParams);
  }

  /**
   * Get dynamic stats for 6 dashboard metric cards
   */
  getDashboardStats(): Observable<{ success: boolean; stats: BackupDashboardStats }> {
    return this.get<{ success: boolean; stats: BackupDashboardStats }>('/stats');
  }

  /**
   * Trigger immediate manual backup
   */
  createManualBackup(operator = 'Administrator'): Observable<{ success: boolean; message: string; backup: BackupItem }> {
    return this.post<{ success: boolean; message: string; backup: BackupItem }>('', { operator });
  }

  /**
   * Get scheduler settings
   */
  getScheduleConfig(): Observable<{ success: boolean; config: ScheduleConfig }> {
    return this.get<{ success: boolean; config: ScheduleConfig }>('/schedule');
  }

  /**
   * Update scheduler settings
   */
  updateScheduleConfig(config: Partial<ScheduleConfig>): Observable<{ success: boolean; message: string; scheduler: any }> {
    return this.put<{ success: boolean; message: string; scheduler: any }>('/schedule', config);
  }

  /**
   * Run read-only database and storage health checks
   */
  runHealthCheck(): Observable<{ success: boolean; report: HealthCheckReport }> {
    return this.post<{ success: boolean; report: HealthCheckReport }>('/health-check', {});
  }

  /**
   * Cryptographically verify backup checksum and internal archive structure
   */
  verifyBackup(id: number): Observable<{ success: boolean; message: string; verification: any }> {
    return this.post<{ success: boolean; message: string; verification: any }>(`/${id}/verify`, {});
  }

  /**
   * Restore database from backup with pre-restore safety snapshot
   */
  restoreBackup(id: number, confirm: boolean, operator = 'Administrator'): Observable<{ success: boolean; message: string; result: any }> {
    return this.post<{ success: boolean; message: string; result: any }>(`/${id}/restore`, { confirm, operator });
  }

  /**
   * Upload backup ZIP archive
   */
  uploadBackup(formData: FormData): Observable<{ success: boolean; message: string; backup: BackupItem }> {
    return this.post<{ success: boolean; message: string; backup: BackupItem }>('/upload', formData);
  }

  /**
   * Download backup archive directly as a file in browser
   */
  downloadBackup(id: number, filename: string): void {
    const url = `${this.baseUrl}/${id}/download`;
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename || `kallmee-backup-${id}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
      },
      error: (err) => {
        console.error('Download error:', err);
        // Fallback direct window navigation
        window.open(url, '_blank');
      }
    });
  }

  /**
   * Delete backup from Firebase Storage and metadata
   */
  deleteBackup(id: number): Observable<{ success: boolean; message: string }> {
    return this.deleteReq<{ success: boolean; message: string }>(`/${id}`);
  }
}
