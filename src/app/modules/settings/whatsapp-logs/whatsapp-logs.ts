import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-whatsapp-logs',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="space-y-8">
      <div>
        <h1 class="text-3xl font-display font-black text-[#1A1A1A] dark:text-white uppercase tracking-tight">WhatsApp Logs</h1>
        <p class="text-slate-500 dark:text-slate-400">Monitor all automated WhatsApp communications.</p>
      </div>

      <div class="card overflow-hidden border-none ring-1 ring-slate-100 dark:ring-white/5 p-0">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date & Time</th>
                <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recipient</th>
                <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Template</th>
                <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Message</th>
                <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-white/5">
              @for (log of logs(); track log.id) {
                <tr class="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <p class="text-sm font-medium text-[#1A1A1A] dark:text-white">{{ log.created_at | date:'medium' }}</p>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <p class="text-sm text-slate-600 dark:text-slate-400">{{ log.recipient }}</p>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      {{ log.template_name }}
                    </span>
                  </td>
                  <td class="px-6 py-4">
                    <p class="text-xs text-slate-500 line-clamp-2 max-w-xs">{{ log.message }}</p>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                      <mat-icon class="text-sm w-4 h-4">check_circle</mat-icon>
                      {{ log.status }}
                    </span>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="px-6 py-12 text-center text-slate-500">
                    <mat-icon class="text-4xl mb-4 opacity-20">history</mat-icon>
                    <p>No WhatsApp logs found.</p>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WhatsAppLogs implements OnInit {
  api = inject(ApiService);
  toast = inject(ToastService);
  logs = signal<any[]>([]);

  ngOnInit() {
    this.loadLogs();
  }

  loadLogs() {
    this.api.getWhatsAppLogs().subscribe({
      next: (logs) => this.logs.set(logs),
      error: () => this.toast.error('Failed to load WhatsApp logs')
    });
  }
}
