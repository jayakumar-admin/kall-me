import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatIconModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
      <div class="w-full max-w-md">
        <div class="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 border border-black/5 dark:border-white/5">
          <div class="text-center mb-8">
            <div class="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <mat-icon class="text-primary text-4xl h-10 w-10">lock_reset</mat-icon>
            </div>
            <h1 class="text-3xl font-black text-slate-900 dark:text-white mb-2">Forgot Password?</h1>
            <p class="text-slate-500 dark:text-slate-400">Enter your details to receive a reset token via WhatsApp.</p>
          </div>

          @if (successMessage()) {
            <div class="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-2xl mb-6 flex items-start gap-3">
              <mat-icon>check_circle</mat-icon>
              <div>
                <p class="font-bold">Success!</p>
                <p class="text-sm">{{ successMessage() }}</p>
                <a routerLink="/reset-password" class="text-primary font-bold hover:underline mt-2 inline-block">Go to Reset Page</a>
              </div>
            </div>
          }

          @if (errorMessage()) {
            <div class="bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 p-4 rounded-2xl mb-6 flex items-center gap-3">
              <mat-icon>error</mat-icon>
              <p class="text-sm font-medium">{{ errorMessage() }}</p>
            </div>
          }

          <form [formGroup]="forgotForm" (ngSubmit)="onSubmit()" class="space-y-6">
            <div class="space-y-4">
              <div class="flex gap-4 mb-4">
                <button type="button" 
                  (click)="method.set('email')"
                  [class]="method() === 'email' ? 'flex-1 py-2 rounded-xl bg-primary text-black font-bold' : 'flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 font-bold'">
                  Email
                </button>
                <button type="button" 
                  (click)="method.set('mobile')"
                  [class]="method() === 'mobile' ? 'flex-1 py-2 rounded-xl bg-primary text-black font-bold' : 'flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 font-bold'">
                  Mobile
                </button>
              </div>

              @if (method() === 'email') {
                <div>
                  <label for="forgotEmail" class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Email Address</label>
                  <div class="relative">
                    <mat-icon class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">email</mat-icon>
                    <input id="forgotEmail" type="email" formControlName="email"
                      class="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-2 focus:ring-primary transition-all outline-none"
                      placeholder="admin@example.com">
                  </div>
                </div>
              } @else {
                <div>
                  <label for="forgotMobile" class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Mobile Number</label>
                  <div class="relative">
                    <mat-icon class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">phone</mat-icon>
                    <input id="forgotMobile" type="text" formControlName="mobile"
                      class="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-2 focus:ring-primary transition-all outline-none"
                      placeholder="+91 98765 43210">
                  </div>
                </div>
              }
            </div>

            <button type="submit" [disabled]="forgotForm.invalid || loading()"
              class="w-full bg-primary hover:bg-primary-dark text-black font-black py-4 rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
              @if (loading()) {
                <div class="w-6 h-6 border-4 border-black/20 border-t-black rounded-full animate-spin"></div>
              } @else {
                <span>Send Reset Token</span>
                <mat-icon>arrow_forward</mat-icon>
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
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  
  method = signal<'email' | 'mobile'>('email');
  loading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  forgotForm = this.fb.group({
    email: [''],
    mobile: ['']
  });

  onSubmit() {
    this.errorMessage.set('');
    this.successMessage.set('');
    
    const { email, mobile } = this.forgotForm.value;

    if (this.method() === 'email' && !email) {
      this.errorMessage.set('Please enter your email');
      return;
    }
    if (this.method() === 'mobile' && !mobile) {
      this.errorMessage.set('Please enter your mobile number');
      return;
    }

    this.loading.set(true);
    const payload: { email?: string; mobile?: string } = {};
    if (this.method() === 'email') {
      payload.email = email as string;
    } else {
      payload.mobile = mobile as string;
    }

    this.auth.forgotPassword(payload).subscribe({
      next: (res) => {
        this.successMessage.set(res.message);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.error || 'Failed to send reset token');
        this.loading.set(false);
      }
    });
  }
}
