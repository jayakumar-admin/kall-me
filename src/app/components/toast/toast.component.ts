import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      @for (toast of toastService.toasts(); track toast.id) {
        <div 
          class="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border animate-in slide-in-from-bottom-5 fade-in duration-300"
          [ngClass]="{
            'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/50 dark:border-emerald-500/30 dark:text-emerald-200': toast.type === 'success',
            'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/50 dark:border-red-500/30 dark:text-red-200': toast.type === 'error',
            'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/50 dark:border-blue-500/30 dark:text-blue-200': toast.type === 'info'
          }"
        >
          <mat-icon class="text-xl shrink-0"
            [ngClass]="{
              'text-emerald-500 dark:text-emerald-400': toast.type === 'success',
              'text-red-500 dark:text-red-400': toast.type === 'error',
              'text-blue-500 dark:text-blue-400': toast.type === 'info'
            }"
          >
            {{ toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info' }}
          </mat-icon>
          <p class="text-sm font-bold">{{ toast.message }}</p>
          <button 
            (click)="toastService.remove(toast.id)" 
            class="ml-2 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0"
          >
            <mat-icon class="text-sm">close</mat-icon>
          </button>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToastComponent {
  toastService = inject(ToastService);
}
