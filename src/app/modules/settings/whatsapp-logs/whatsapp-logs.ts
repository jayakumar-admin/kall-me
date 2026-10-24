import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../services/toast.service';
import { SearchService } from '../../../services/search.service';

interface WhatsAppLog {
  id: number;
  created_at: string;
  recipient: string;
  template_name: string;
  message: string;
  status: string;
}

@Component({
  selector: 'app-whatsapp-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="space-y-4 md:space-y-8">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl md:text-3xl font-display font-black text-[#1A1A1A] dark:text-white uppercase tracking-tight">WhatsApp Logs</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400">Monitor all automated WhatsApp communications.</p>
        </div>

        <div class="relative w-full sm:w-72">
          <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg w-5 h-5 flex items-center justify-center">search</mat-icon>
          <input type="text"
                 [ngModel]="localSearch() || search.searchTerm()"
                 (ngModelChange)="onSearchChange($event)"
                 placeholder="Search logs..."
                 class="w-full pl-9 pr-8 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20">
          @if (effectiveSearch()) {
            <button (click)="clearSearch()" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5 rounded-full">
              <mat-icon class="text-sm w-4 h-4 flex items-center justify-center">close</mat-icon>
            </button>
          }
        </div>
      </div>

      <div class="card overflow-hidden border-none ring-1 ring-slate-100 dark:ring-white/5 p-0">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                <th class="px-4 md:px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</th>
                <th class="px-4 md:px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recipient</th>
                <th class="hidden md:table-cell px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Template</th>
                <th class="hidden lg:table-cell px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Message</th>
                <th class="px-4 md:px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-white/5">
              @for (log of filteredLogs(); track log.id) {
                <tr class="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <td class="px-4 md:px-6 py-4 whitespace-nowrap">
                    <p class="text-xs md:text-sm font-medium text-[#1A1A1A] dark:text-white">{{ log.created_at | date:'short' }}</p>
                  </td>
                  <td class="px-4 md:px-6 py-4 whitespace-nowrap">
                    <p class="text-xs md:text-sm text-slate-600 dark:text-slate-400">{{ log.recipient }}</p>
                  </td>
                  <td class="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-[9px] md:text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      {{ log.template_name }}
                    </span>
                  </td>
                  <td class="hidden lg:table-cell px-6 py-4">
                    <p class="text-xs text-slate-500 line-clamp-2 max-w-xs">{{ log.message }}</p>
                  </td>
                  <td class="px-4 md:px-6 py-4 whitespace-nowrap">
                    <span class="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-[10px] md:text-xs font-bold">
                      <mat-icon class="text-sm w-4 h-4">check_circle</mat-icon>
                      {{ log.status }}
                    </span>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="px-6 py-12 text-center text-slate-500">
                    <mat-icon class="text-4xl mb-4 opacity-20">{{ effectiveSearch() ? 'search_off' : 'history' }}</mat-icon>
                    <p>{{ effectiveSearch() ? 'No WhatsApp logs matching "' + effectiveSearch() + '"' : 'No WhatsApp logs found.' }}</p>
                    @if (effectiveSearch()) {
                      <button (click)="clearSearch()" class="mt-3 px-3 py-1.5 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-200 transition-colors">
                        Clear search
                      </button>
                    }
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
  search = inject(SearchService);
  
  logs = signal<WhatsAppLog[]>([]);
  localSearch = signal<string>('');

  effectiveSearch = computed(() => {
    return (this.localSearch() || this.search.searchTerm() || '').toLowerCase().trim();
  });

  filteredLogs = computed(() => {
    const term = this.effectiveSearch();
    const list = this.logs();
    if (!term) return list;
    return list.filter(l =>
      (l.recipient && l.recipient.toLowerCase().includes(term)) ||
      (l.template_name && l.template_name.toLowerCase().includes(term)) ||
      (l.message && l.message.toLowerCase().includes(term)) ||
      (l.status && l.status.toLowerCase().includes(term))
    );
  });

  ngOnInit() {
    this.loadLogs();
  }

  loadLogs() {
    this.api.getWhatsAppLogs().subscribe({
      next: (logs) => this.logs.set(logs as WhatsAppLog[]),
      error: () => this.toast.error('Failed to load WhatsApp logs')
    });
  }

  onSearchChange(term: string) {
    this.localSearch.set(term);
    this.search.setSearchTerm(term);
  }

  clearSearch() {
    this.localSearch.set('');
    this.search.clearSearch();
  }
}
