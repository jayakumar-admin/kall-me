import { Component, inject, signal, effect, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { BackupAuthService } from '../../services/backup-auth.service';

@Component({
  selector: 'app-master-password-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    @if (backupAuth.dialogOpen()) {
      <div 
        class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
        (keydown.escape)="cancel()"
      >
        <div 
          class="bg-white dark:bg-[#1E293B] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-white/10 animate-in zoom-in-95 duration-200"
        >
          <!-- Header Banner -->
          <div class="p-6 md:p-8 text-center pb-4">
            <div class="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/10">
              <mat-icon class="text-3xl h-8 w-8">admin_panel_settings</mat-icon>
            </div>
            
            <h3 class="text-xl md:text-2xl font-display font-black text-[#1A1A1A] dark:text-white uppercase tracking-tight mb-2">
              Master Admin Access
            </h3>
            
            <p class="text-slate-500 dark:text-slate-400 text-xs md:text-sm leading-relaxed">
              Database Backup & Disaster Recovery is restricted. Enter the master admin password to unlock.
            </p>
          </div>

          <!-- Form Area -->
          <div class="px-6 md:px-8 space-y-4">
            @if (backupAuth.errorMessage()) {
              <div class="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold animate-in shake">
                <mat-icon class="text-base h-4 w-4 shrink-0">error</mat-icon>
                <span>{{ backupAuth.errorMessage() }}</span>
              </div>
            }

            <div>
              <label for="masterPasswordInput" class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Master Password
              </label>
              
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <mat-icon class="text-lg h-5 w-5">key</mat-icon>
                </div>
                
                <input 
                  #passwordInput
                  id="masterPasswordInput"
                  [type]="showPassword() ? 'text' : 'password'"
                  [(ngModel)]="password"
                  (keydown.enter)="submit()"
                  placeholder="Enter master password"
                  class="w-full pl-10 pr-12 py-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-[#1A1A1A] dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all font-mono"
                  autocomplete="off"
                />

                <button 
                  type="button"
                  (click)="showPassword.set(!showPassword())"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  tabindex="-1"
                >
                  <mat-icon class="text-lg h-5 w-5">{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
              </div>
            </div>
          </div>

          <!-- Action Footer -->
          <div class="p-6 md:p-8 pt-6 flex gap-3">
            <button 
              type="button"
              (click)="cancel()"
              class="flex-1 px-4 py-3 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300 font-bold text-sm transition-all"
            >
              Cancel
            </button>
            
            <button 
              type="button"
              (click)="submit()"
              class="flex-1 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-sm transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 active:scale-95"
            >
              <mat-icon class="text-lg h-5 w-5">lock_open</mat-icon>
              <span>Unlock Access</span>
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class MasterPasswordModalComponent {
  public backupAuth = inject(BackupAuthService);
  
  password = '';
  showPassword = signal(false);
  passwordInput = viewChild<ElementRef<HTMLInputElement>>('passwordInput');

  constructor() {
    // Auto-focus input and reset password when dialog opens
    effect(() => {
      if (this.backupAuth.dialogOpen()) {
        this.password = '';
        this.showPassword.set(false);
        setTimeout(() => {
          this.passwordInput()?.nativeElement.focus();
        }, 50);
      }
    });
  }

  submit() {
    if (!this.password.trim()) {
      this.backupAuth.errorMessage.set('Please enter master password.');
      return;
    }
    const success = this.backupAuth.verify(this.password.trim());
    if (success) {
      this.password = '';
    }
  }

  cancel() {
    this.password = '';
    this.backupAuth.cancel();
  }
}
