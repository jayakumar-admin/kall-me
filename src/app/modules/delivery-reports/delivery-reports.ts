import { ChangeDetectionStrategy, Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { DeliveryPerson } from '../../models';

interface ReportData {
  total_orders: number;
  total_amount: number;
  item_total: number;
  delivery_total: number;
  below_30_count: number;
  total_commission: number;
  advance_amount: number;
  bonus: number;
  final_earnings: number;
  balance_pending: number;
}

@Component({
  selector: 'app-delivery-reports',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  template: `
    <div class="h-full overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-6 sm:space-y-8">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div class="space-y-1">
          <h1 class="text-2xl sm:text-3xl font-display font-black text-[#1A1A1A] dark:text-white uppercase tracking-tight">Delivery Reports</h1>
          <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Earnings and performance metrics per delivery partner.</p>
        </div>
        <div class="bg-indigo-600 text-white p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-lg flex items-center gap-3 sm:gap-4 border border-indigo-400 w-full lg:w-auto">
          <div class="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
            <mat-icon class="text-sm sm:text-base">payments</mat-icon>
          </div>
          <div>
            <p class="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-indigo-100">Total Admin Commission</p>
            <p class="text-xl sm:text-2xl font-black">₹{{ overallAdminCommission() | number:'1.0-0' }}</p>
          </div>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center bg-white dark:bg-[#1E293B] p-3 sm:p-4 rounded-xl shadow-sm border border-slate-100 dark:border-white/5 font-mono">
        <div class="flex items-center gap-2 flex-1">
          <label for="startDate" class="text-xs font-bold text-slate-500 uppercase shrink-0">From</label>
          <input id="startDate" type="date" [value]="startDate()" (change)="onDateChange('startDate', $event)" class="w-full bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-white/10 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none">
        </div>
        <div class="flex items-center gap-2 flex-1">
          <label for="endDate" class="text-xs font-bold text-slate-500 uppercase shrink-0">To</label>
          <input id="endDate" type="date" [value]="endDate()" (change)="onDateChange('endDate', $event)" class="w-full bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-white/10 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none">
        </div>
      </div>

      <!-- Mobile Dropdown Search -->
      <div class="lg:hidden space-y-3">
        <div class="relative">
          <label for="partnerSearch" class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Select Delivery Partner</label>
          <div class="relative group">
            <div class="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
              <mat-icon class="text-lg">search</mat-icon>
            </div>
            <input 
              id="partnerSearch"
              type="text" 
              [(ngModel)]="searchQuery" 
              placeholder="Search Partner Name..." 
              (focus)="showDropdown.set(true)"
              (keydown.escape)="showDropdown.set(false)"
              class="w-full bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm font-bold shadow-sm focus:ring-2 focus:ring-[#FFC107] outline-none transition-all"
            >
            @if (showDropdown() && filteredPartners().length > 0) {
              <div class="absolute z-50 w-full mt-2 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl max-h-60 overflow-y-auto overflow-x-hidden custom-scrollbar divide-y divide-slate-50 dark:divide-white/5 animate-in fade-in slide-in-from-top-2 duration-200">
                <button 
                  (click)="selectPartner(null)"
                  class="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-white/5 flex items-center justify-between transition-colors focus:bg-slate-50 outline-none"
                >
                  <span class="font-bold text-sm text-[#FFC107]">View All Partners</span>
                  @if (!selectedPartnerId()) {
                    <mat-icon class="text-[#FFC107]">check_circle</mat-icon>
                  }
                </button>
                @for (p of filteredPartners(); track p.id) {
                  <button 
                    (click)="selectPartner(p.id)"
                    class="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-white/5 flex items-center justify-between transition-colors focus:bg-slate-50 outline-none"
                  >
                    <span class="font-bold text-sm dark:text-white" [class.text-[#FFC107]]="selectedPartnerId() === p.id">{{p.name}}</span>
                    @if (selectedPartnerId() === p.id) {
                      <mat-icon class="text-[#FFC107]">check_circle</mat-icon>
                    }
                  </button>
                }
              </div>
            }
          </div>
          @if (showDropdown()) {
            <div (click)="showDropdown.set(false)" (keydown.escape)="showDropdown.set(false)" role="button" tabindex="0" aria-label="Close dropdown" class="fixed inset-0 z-40 bg-transparent"></div>
          }
        </div>
      </div>

      @if (loading()) {
        <div class="py-12 text-center text-slate-500 flex flex-col items-center">
          <mat-icon class="animate-spin text-4xl mb-2">refresh</mat-icon>
          <p>Loading reports...</p>
        </div>
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          @for (dp of displayData(); track dp.id) {
            <div class="card border-none ring-1 ring-slate-100 dark:ring-white/5 rounded-xl sm:rounded-2xl bg-white dark:bg-[#1E293B] shadow-sm overflow-hidden p-4 sm:p-6 flex flex-col h-full hover:shadow-md transition-shadow">
              <div class="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#FFC107]/20 text-[#FFC107] flex items-center justify-center font-black text-lg sm:text-xl shrink-0">
                  {{ dp.name.charAt(0) }}
                </div>
                <div class="min-w-0">
                  <h3 class="text-base sm:text-lg font-black text-[#1A1A1A] dark:text-white uppercase leading-tight truncate">{{dp.name}}</h3>
                  <p class="text-[10px] text-slate-500 uppercase font-black tracking-wider">Delivery Partner</p>
                </div>
              </div>

              <div class="flex-grow space-y-2 sm:space-y-3 text-xs sm:text-sm">
                <div class="flex justify-between border-b border-slate-50 dark:border-white/5 pb-1 sm:pb-2">
                  <span class="text-slate-500">Orders / Total:</span>
                  <span class="font-bold text-[#1A1A1A] dark:text-white">{{dp.total_orders}} / ₹{{dp.total_amount | number:'1.0-0'}}</span>
                </div>
                <div class="flex justify-between border-b border-slate-50 dark:border-white/5 pb-1 sm:pb-2">
                  <span class="text-slate-500">Item Total:</span>
                  <span class="font-bold text-[#1A1A1A] dark:text-white">₹{{dp.item_total | number:'1.0-0'}}</span>
                </div>
                <div class="flex justify-between border-b border-slate-50 dark:border-white/5 pb-1 sm:pb-2">
                  <span class="text-slate-500">Delivery / ₹30:</span>
                  <span class="font-bold text-[#1A1A1A] dark:text-white">₹{{dp.delivery_total | number:'1.0-0'}} ({{dp.below_30_count}})</span>
                </div>
                <div class="flex justify-between border-b border-slate-50 dark:border-white/5 pb-1 sm:pb-2">
                  <span class="text-slate-500 italic">Bonus:</span>
                  <span class="font-bold text-emerald-600">₹{{dp.bonus | number:'1.0-0'}}</span>
                </div>
                <div class="flex justify-between border-b border-slate-50 dark:border-white/5 pb-1 sm:pb-2">
                  <span class="text-slate-500">Admin Commission:</span>
                  <span class="font-bold text-indigo-600 dark:text-indigo-400">₹{{dp.total_commission | number:'1.0-0'}}</span>
                </div>
                <div class="flex justify-between border-b border-slate-50 dark:border-white/5 pb-1 sm:pb-2">
                  <span class="text-indigo-600 dark:text-indigo-400 font-bold uppercase text-[10px] sm:text-xs">Payable to Admin:</span>
                  <span class="font-black text-indigo-700 dark:text-indigo-300">₹{{dp.adminPayable | number:'1.0-0'}}</span>
                </div>
                <div class="flex justify-between border-b border-slate-50 dark:border-white/5 pb-1 sm:pb-2">
                  <span class="text-rose-500 font-bold">Advance / Pending:</span>
                  <span class="font-bold text-rose-600">₹{{dp.advance_amount | number:'1.0-0'}} / ₹{{dp.balance_pending | number:'1.0-0'}}</span>
                </div>
              </div>

              <div class="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t-2 border-dashed border-slate-100 dark:border-white/10 grid grid-cols-2 gap-2 sm:gap-4">
                <div class="text-center sm:text-left">
                  <p class="text-[9px] sm:text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Admin Earning</p>
                  <p class="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400">₹{{dp.total_commission | number:'1.0-0'}}</p>
                </div>
                <div class="flex flex-col items-center sm:items-end border-l border-slate-100 dark:border-white/5 pl-2 sm:pl-4">
                  <p class="text-[9px] sm:text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Partner Earning</p>
                  <div class="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-display leading-tight">
                    ₹{{dp.final_earnings | number:'1.0-0'}}
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeliveryReports implements OnInit {
  private api = inject(ApiService);
  deliveryPersons = signal<DeliveryPerson[]>([]);
  reportData = signal<Record<string, ReportData>>({});
  
  mergedData = computed(() => {
    return this.deliveryPersons().map(dp => {
      const data = this.reportData()[dp.name] || { 
        total_orders: 0, total_amount: 0, item_total: 0, delivery_total: 0, 
        below_30_count: 0, total_commission: 0, advance_amount: 0, bonus: 0, 
        final_earnings: 0, balance_pending: 0 
      };
      
      const adminPayable = Number(data.item_total || 0) + Number(data.total_commission || 0) - (Number(data.bonus || 0) + Number(data.advance_amount || 0));
      
      return { ...dp, ...data, adminPayable, expanded: false };
    });
  });

  overallAdminCommission = computed(() => {
    return Object.values(this.reportData()).reduce((acc, curr) => acc + (Number(curr.total_commission) || 0), 0);
  });

  loading = signal(true);
  startDate = signal(new Date().toISOString().split('T')[0]);
  endDate = signal(new Date().toISOString().split('T')[0]);

  // Search & Filter
  searchQuery = signal('');
  selectedPartnerId = signal<number | null>(null);
  showDropdown = signal(false);

  filteredPartners = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.deliveryPersons();
    return this.deliveryPersons().filter(p => p.name.toLowerCase().includes(query));
  });

  displayData = computed(() => {
    const all = this.mergedData();
    const selectedId = this.selectedPartnerId();
    if (selectedId === null) return all;
    return all.filter(d => d.id === selectedId);
  });

  ngOnInit() {
    this.api.getDeliveryTeam().subscribe(drivers => {
      this.deliveryPersons.set(drivers);
      this.loadReport();
    });
  }

  loadReport() {
    this.loading.set(true);
    this.api.getDeliveryPersonReport(this.startDate(), this.endDate()).subscribe({
      next: (data) => {
        const reportMap: Record<string, ReportData> = {};
        data.forEach(d => reportMap[d.name] = d);
        this.reportData.set(reportMap);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onDateChange(field: 'startDate' | 'endDate', event: Event) {
    const value = (event.target as HTMLInputElement).value;
    if (field === 'startDate') this.startDate.set(value);
    else this.endDate.set(value);
    this.loadReport();
  }

  selectPartner(id: number | null) {
    this.selectedPartnerId.set(id);
    if (id) {
      const partner = this.deliveryPersons().find(p => p.id === id);
      if (partner) this.searchQuery.set(partner.name);
    } else {
      this.searchQuery.set('');
    }
    this.showDropdown.set(false);
  }
}
