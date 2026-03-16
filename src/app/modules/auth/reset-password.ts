import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatIconModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
      <div class="w-full max-w-md">
        <div class="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 border border-black/5 dark:border-white/5">
          <div class="text-center mb-8">
            <div class="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <mat-icon class="text-primary text-4xl h-10 w-10">vpn_key</mat-icon>
            </div>
            <h1 class="text-3xl font-black text-slate-900 dark:text-white mb-2">Reset Password</h1>
            <p class="text-slate-500 dark:text-slate-400">Enter the token sent to you and your new password.</p>
          </div>

          @if (errorMessage()) {
            <div class="bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 p-4 rounded-2xl mb-6 flex items-center gap-3">
              <mat-icon>error</mat-icon>
              <p class="text-sm font-medium">{{ errorMessage() }}</p>
            </div>
          }

          <form [formGroup]="resetForm" (ngSubmit)="onSubmit()" class="space-y-6">
            <div class="space-y-4">
              <div>
                <label for="resetToken" class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Reset Token</label>
                <div class="relative">
                  <mat-icon class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">code</mat-icon>
                  <input id="resetToken" type="text" formControlName="token"
                    class="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-2 focus:ring-primary transition-all outline-none"
                    placeholder="Enter 64-character token">
                </div>
              </div>

              <div>
                <label for="resetNewPassword" class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">New Password</label>
                <div class="relative">
                  <mat-icon class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">lock</mat-icon>
                  <input id="resetNewPassword" [type]="showPassword() ? 'text' : 'password'" formControlName="newPassword"
                    class="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-2 focus:ring-primary transition-all outline-none"
                    placeholder="••••••••">
                  <button type="button" (click)="showPassword.set(!showPassword())"
                    class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors">
                    <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
                  </button>
                </div>
              </div>
            </div>

            <button type="submit" [disabled]="resetForm.invalid || loading()"
              class="w-full bg-primary hover:bg-primary-dark text-black font-black py-4 rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
              @if (loading()) {
                <div class="w-6 h-6 border-4 border-black/20 border-t-black rounded-full animate-spin"></div>
              } @else {
                <span>Reset Password</span>
                <mat-icon>check_circle</mat-icon>
              }
            </button>

            <div class="text-center">
              <a routerLink="/login" class="text-slate-500 hover:text-primary font-bold transition-colors">Back to Login</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class ResetPasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  
  loading = signal(false);
  errorMessage = signal('');
  showPassword = signal(false);

  resetForm = this.fb.group({
    token: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(6)]]
  });

  onSubmit() {
    if (this.resetForm.invalid) return;
    
    this.errorMessage.set('');
    this.loading.set(true);
    
    const { token, newPassword } = this.resetForm.value;
    
    this.auth.resetPassword({ token: token!, newPassword: newPassword! }).subscribe({
      next: () => {
        alert('Password reset successful! Please login with your new password.');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.error || 'Failed to reset password');
        this.loading.set(false);
      }
    });
  }
}
