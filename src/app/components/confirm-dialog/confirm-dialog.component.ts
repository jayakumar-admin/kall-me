import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div class="bg-white dark:bg-[#1E293B] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
        <div class="p-6 text-center">
          <div class="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <mat-icon class="text-3xl h-8 w-8">warning</mat-icon>
          </div>
          <h3 class="text-xl font-display font-black text-[#1A1A1A] dark:text-white uppercase tracking-tight mb-2">{{ title }}</h3>
          <p class="text-slate-500 dark:text-slate-400 text-sm">{{ message }}</p>
        </div>
        
        <div class="p-4 bg-slate-50 dark:bg-white/5 flex gap-3">
          <button (click)="cancelled.emit()" class="flex-1 px-4 py-2.5 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 font-bold text-sm transition-all hover:bg-slate-50">
            Cancel
          </button>
          <button (click)="confirmed.emit()" class="flex-1 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm transition-all shadow-lg shadow-rose-500/20">
            Confirm
          </button>
        </div>
      </div>
    </div>
  `
})
export class ConfirmDialog {
  @Input() title = 'Are you sure?';
  @Input() message = 'This action cannot be undone.';
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
}
