import { ChangeDetectionStrategy, Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api.service';
import { DeliveryPerson } from '../../models';

interface ReportData {
  total_orders: number;
  total_amount: number;
  item_total: number;
  delivery_total: number;
  below_30_count: number;
  total_commission: number;
  bonus: number;
  final_earnings: number;
  balance_pending: number;
}

@Component({
  selector: 'app-delivery-reports',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-full overflow-y-auto p-6 custom-scrollbar space-y-8">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-display font-black text-[#1A1A1A] dark:text-white uppercase tracking-tight">Delivery Person-wise Report</h1>
          <p class="text-slate-500 dark:text-slate-400">Detailed earnings and performance breakdown for each delivery person.</p>
        </div>
        <div class="bg-indigo-600 text-white p-4 rounded-2xl shadow-lg flex items-center gap-4 border border-indigo-400">
          <div class="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <mat-icon>payments</mat-icon>
          </div>
          <div>
            <p class="text-[10px] font-black uppercase tracking-widest text-indigo-100">Overall Admin Commission</p>
            <p class="text-2xl font-black">₹{{ overallAdminCommission() | number:'1.0-0' }}</p>
          </div>
        </div>
      </div>

      <div class="flex gap-4 items-center bg-white dark:bg-[#1E293B] p-4 rounded-xl shadow-sm border border-slate-100 dark:border-white/5">
        <label for="startDate" class="text-sm font-bold text-slate-500">From:</label>
        <input id="startDate" type="date" [value]="startDate()" (change)="onDateChange('startDate', $event)" class="bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-white/10 rounded-lg p-2 text-sm">
        <label for="endDate" class="text-sm font-bold text-slate-500">To:</label>
        <input id="endDate" type="date" [value]="endDate()" (change)="onDateChange('endDate', $event)" class="bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-white/10 rounded-lg p-2 text-sm">
      </div>

      @if (loading()) {
        <div class="py-12 text-center text-slate-500 flex flex-col items-center">
          <mat-icon class="animate-spin text-4xl mb-2">refresh</mat-icon>
          <p>Loading reports...</p>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (dp of mergedData(); track dp.id) {
            <div class="card border-none ring-1 ring-slate-100 dark:ring-white/5 rounded-2xl bg-white dark:bg-[#1E293B] shadow-sm overflow-hidden p-6 flex flex-col h-full">
              <div class="flex items-center gap-4 mb-6">
                <div class="w-12 h-12 rounded-full bg-[#FFC107]/20 text-[#FFC107] flex items-center justify-center font-bold text-xl">
                  {{ dp.name.charAt(0) }}
                </div>
                <div>
                  <h3 class="text-lg font-black text-[#1A1A1A] dark:text-white uppercase leading-tight">{{dp.name}}</h3>
                  <p class="text-xs text-slate-500 uppercase font-bold tracking-wider">Delivery Partner</p>
                </div>
              </div>

              <div class="flex-grow space-y-3 text-sm">
                <div class="flex justify-between border-b border-slate-50 dark:border-white/5 pb-2">
                  <span class="text-slate-500">Total Orders:</span>
                  <span class="font-bold text-[#1A1A1A] dark:text-white">{{dp.total_orders}}</span>
                </div>
                <div class="flex justify-between border-b border-slate-50 dark:border-white/5 pb-2">
                  <span class="text-slate-500">Total Amount:</span>
                  <span class="font-bold text-[#1A1A1A] dark:text-white">₹{{dp.total_amount | number:'1.0-0'}}</span>
                </div>
                <div class="flex justify-between border-b border-slate-50 dark:border-white/5 pb-2">
                  <span class="text-slate-500">Item Total:</span>
                  <span class="font-bold text-[#1A1A1A] dark:text-white">₹{{dp.item_total | number:'1.0-0'}}</span>
                </div>
                <div class="flex justify-between border-b border-slate-50 dark:border-white/5 pb-2">
                  <span class="text-slate-500">Delivery Charges:</span>
                  <span class="font-bold text-[#1A1A1A] dark:text-white">₹{{dp.delivery_total | number:'1.0-0'}}</span>
                </div>
                <div class="flex justify-between border-b border-slate-50 dark:border-white/5 pb-2">
                  <span class="text-slate-500">₹30 Orders Count:</span>
                  <span class="font-bold text-[#1A1A1A] dark:text-white">{{dp.below_30_count}}</span>
                </div>
                <div class="flex justify-between border-b border-slate-50 dark:border-white/5 pb-2">
                  <span class="text-slate-500">Bonus:</span>
                  <span class="font-bold text-[#1A1A1A] dark:text-white">₹{{dp.bonus | number:'1.0-0'}}</span>
                </div>
                <div class="flex justify-between border-b border-slate-50 dark:border-white/5 pb-2">
                  <span class="text-slate-500">Admin Commission:</span>
                  <span class="font-bold text-indigo-600 dark:text-indigo-400">₹{{dp.total_commission | number:'1.0-0'}}</span>
                </div>
                <div class="flex justify-between border-b border-slate-50 dark:border-white/5 pb-2">
                  <span class="text-slate-500 font-bold">Pending Amount:</span>
                  <span class="font-bold text-rose-500">₹{{dp.balance_pending | number:'1.0-0'}}</span>
                </div>
              </div>

              <div class="mt-6 pt-4 border-t-2 border-dashed border-slate-100 dark:border-white/10 grid grid-cols-2 gap-4">
                <div>
                  <p class="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1 text-center sm:text-left">Admin Earning</p>
                  <p class="text-lg font-black text-indigo-600 dark:text-indigo-400 text-center sm:text-left">₹{{dp.total_commission | number:'1.0-0'}}</p>
                </div>
                <div class="flex flex-col items-center sm:items-end border-l border-slate-100 dark:border-white/5 pl-4">
                  <p class="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Driver Earning</p>
                  <div class="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-display leading-tight">
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
      const data = this.reportData()[dp.name] || { total_orders: 0, total_amount: 0, item_total: 0, delivery_total: 0, below_30_count: 0, total_commission: 0, bonus: 0, final_earnings: 0, balance_pending: 0 };
      return { ...dp, ...data, expanded: false };
    });
  });

  overallAdminCommission = computed(() => {
    return Object.values(this.reportData()).reduce((acc, curr) => acc + (Number(curr.total_commission) || 0), 0);
  });

  loading = signal(true);
  startDate = signal(new Date().toISOString().split('T')[0]);
  endDate = signal(new Date().toISOString().split('T')[0]);

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
}
