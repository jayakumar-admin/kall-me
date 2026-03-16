import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-security-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="p-6 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 class="text-2xl font-black text-slate-900 dark:text-white mb-2">Security Settings</h1>
        <p class="text-slate-500 dark:text-slate-400">Manage your password and account security.</p>
      </div>

      <div class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
        <div class="p-6 border-b border-slate-200 dark:border-white/5">
          <h2 class="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <mat-icon class="text-primary">lock</mat-icon>
            Change Password
          </h2>
        </div>

        <div class="p-6 space-y-6">
          <div class="space-y-2">
            <label for="currentPassword" class="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Current Password</label>
            <input id="currentPassword" type="password" [(ngModel)]="passwordData.currentPassword"
              class="w-full p-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-2 focus:ring-primary transition-all outline-none"
              placeholder="••••••••">
          </div>

          <div class="space-y-2">
            <label for="newPassword" class="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">New Password</label>
            <input id="newPassword" type="password" [(ngModel)]="passwordData.newPassword"
              class="w-full p-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-2 focus:ring-primary transition-all outline-none"
              placeholder="••••••••">
            <p class="text-xs text-slate-400 ml-1">Must be at least 6 characters long.</p>
          </div>

          <div class="space-y-2">
            <label for="confirmPassword" class="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Confirm New Password</label>
            <input id="confirmPassword" type="password" [(ngModel)]="passwordData.confirmPassword"
              class="w-full p-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-2 focus:ring-primary transition-all outline-none"
              placeholder="••••••••">
          </div>
        </div>

        <div class="p-6 bg-slate-50 dark:bg-white/5 flex justify-end">
          <button (click)="onSubmit()" [disabled]="loading()"
            class="bg-primary hover:bg-primary-dark text-black font-black py-3 px-8 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2">
            @if (loading()) {
              <div class="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
            } @else {
              <span>Update Password</span>
              <mat-icon>save</mat-icon>
            }
          </button>
        </div>
      </div>
    </div>
  `
})
export class SecuritySettings {
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  loading = signal(false);
  passwordData = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  onSubmit() {
    if (!this.passwordData.currentPassword || !this.passwordData.newPassword || !this.passwordData.confirmPassword) {
      this.toast.show('Please fill in all fields', 'error');
      return;
    }

    if (this.passwordData.newPassword !== this.passwordData.confirmPassword) {
      this.toast.show('New passwords do not match', 'error');
      return;
    }

    if (this.passwordData.newPassword.length < 6) {
      this.toast.show('Password must be at least 6 characters', 'error');
      return;
    }

    this.loading.set(true);
    this.auth.changePassword({
      currentPassword: this.passwordData.currentPassword,
      newPassword: this.passwordData.newPassword
    }).subscribe({
      next: () => {
        this.toast.show('Password updated successfully', 'success');
        this.passwordData = { currentPassword: '', newPassword: '', confirmPassword: '' };
        this.loading.set(false);
      },
      error: (err) => {
        this.toast.show(err.error?.error || 'Failed to update password', 'error');
        this.loading.set(false);
      }
    });
  }
}
