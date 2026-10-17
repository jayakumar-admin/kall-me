import { Injectable, signal, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class BackupAuthService {
  private toast = inject(ToastService);

  private readonly MASTER_PASSWORD = 'Mec170761$';
  private readonly SESSION_STORAGE_KEY = 'kallme_master_backup_unlocked';

  public isUnlocked = signal<boolean>(false);
  public dialogOpen = signal<boolean>(false);
  public errorMessage = signal<string>('');

  private pendingResolver: ((unlocked: boolean) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      const saved = sessionStorage.getItem(this.SESSION_STORAGE_KEY);
      if (saved === 'true') {
        this.isUnlocked.set(true);
      }
    }
  }

  /**
   * Request unlock. Returns a Promise resolving to true if unlocked, or false if cancelled/failed.
   */
  requestUnlock(): Promise<boolean> {
    if (this.isUnlocked()) {
      return Promise.resolve(true);
    }

    this.errorMessage.set('');
    this.dialogOpen.set(true);

    return new Promise<boolean>((resolve) => {
      this.pendingResolver = resolve;
    });
  }

  /**
   * Verify password provided by the user in the popup modal.
   */
  verify(password: string): boolean {
    if (password === this.MASTER_PASSWORD) {
      this.isUnlocked.set(true);
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(this.SESSION_STORAGE_KEY, 'true');
      }
      this.dialogOpen.set(false);
      this.errorMessage.set('');

      if (this.pendingResolver) {
        this.pendingResolver(true);
        this.pendingResolver = null;
      }

      this.toast.success('Master Admin verified! Access granted.');
      return true;
    } else {
      this.errorMessage.set('Incorrect Master Password. Access Denied.');
      return false;
    }
  }

  /**
   * Cancel and close modal.
   */
  cancel() {
    this.dialogOpen.set(false);
    this.errorMessage.set('');
    if (this.pendingResolver) {
      this.pendingResolver(false);
      this.pendingResolver = null;
    }
  }

  /**
   * Re-lock backup access.
   */
  lock() {
    this.isUnlocked.set(false);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(this.SESSION_STORAGE_KEY);
    }
  }
}
