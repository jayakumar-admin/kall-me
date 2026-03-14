import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { Order } from '../../models';
import { CatalogService } from '../../services/catalog.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  template: `
    <div class="h-full overflow-y-auto p-6 custom-scrollbar space-y-8">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-display font-black text-[#1A1A1A] dark:text-white uppercase tracking-tight">Reports & Analytics</h1>
          <p class="text-slate-500 dark:text-slate-400">Track your business performance and growth.</p>
        </div>
        <div class="flex flex-wrap gap-3">
          <button (click)="exportCSV()" class="px-4 py-2.5 rounded-xl bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-400 font-bold text-sm flex items-center gap-2 shadow-sm hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
            <mat-icon class="text-lg">table_view</mat-icon>
            Export CSV
          </button>
          <button (click)="exportPDF()" class="px-4 py-2.5 rounded-xl bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-400 font-bold text-sm flex items-center gap-2 shadow-sm hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
            <mat-icon class="text-lg">picture_as_pdf</mat-icon>
            Export PDF
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="card border-none ring-1 ring-slate-100 dark:ring-white/5">
        <div class="flex items-center justify-between gap-2 mb-4">
          <div class="flex items-center gap-2">
            <mat-icon class="text-[#FFC107]">filter_list</mat-icon>
            <h3 class="font-bold text-[#1A1A1A] dark:text-white">Customized Filters</h3>
          </div>
          <button (click)="resetFilters()" class="text-xs font-bold text-[#FFC107] hover:text-[#E6AE06] transition-colors flex items-center gap-1">
            <mat-icon class="text-sm">restart_alt</mat-icon>
            Reset Filters
          </button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label for="startDate" class="text-xs font-bold text-slate-500 mb-2 block">Start Date</label>
            <input id="startDate" type="date" [ngModel]="startDate()" (ngModelChange)="startDate.set($event)" class="input-field py-2 text-sm">
          </div>
          <div>
            <label for="endDate" class="text-xs font-bold text-slate-500 mb-2 block">End Date</label>
            <input id="endDate" type="date" [ngModel]="endDate()" (ngModelChange)="endDate.set($event)" class="input-field py-2 text-sm">
          </div>
          <div>
            <label for="statusFilter" class="text-xs font-bold text-slate-500 mb-2 block">Order Status</label>
            <select id="statusFilter" [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)" class="input-field py-2 text-sm appearance-none">
              <option value="all">All Statuses</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
              <option value="in-progress">In Progress</option>
              <option value="placed">Placed</option>
            </select>
          </div>
          <div>
            <label for="merchantFilter" class="text-xs font-bold text-slate-500 mb-2 block">Merchant</label>
            <select id="merchantFilter" [ngModel]="merchantFilter()" (ngModelChange)="merchantFilter.set($event)" class="input-field py-2 text-sm appearance-none">
              <option value="all">All Merchants</option>
              @for (merchant of uniqueMerchants(); track merchant.id) {
                <option [value]="merchant.id">{{ merchant.name }}</option>
              }
            </select>
          </div>
        </div>
      </div>

      <!-- Metrics -->
      @if (orders().length === 0) {
        <div class="py-12 text-center text-slate-500">
          <mat-icon class="animate-spin text-4xl mb-2">refresh</mat-icon>
          <p>Loading reports...</p>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="card border-none ring-1 ring-slate-100 dark:ring-white/5 bg-[#FFC107]/5">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Hotel Earnings</p>
            <p class="text-3xl font-black text-[#1A1A1A] dark:text-white">₹{{ (metrics().hotelEarnings || 0).toLocaleString() }}</p>
            <p class="text-[10px] text-slate-500 mt-2">Total payout to restaurant partners</p>
          </div>
          <div class="card border-none ring-1 ring-slate-100 dark:ring-white/5">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Delivery Salary</p>
            <p class="text-3xl font-black text-[#1A1A1A] dark:text-white">₹{{ (metrics().deliverySalary || 0).toLocaleString() }}</p>
            <p class="text-[10px] text-slate-500 mt-2">Total payout to delivery partners</p>
          </div>
          <div class="card border-none ring-1 ring-slate-100 dark:ring-white/5">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Admin Commission</p>
            <p class="text-3xl font-black text-[#FFC107]">₹{{ (metrics().adminCommission || 0).toLocaleString() }}</p>
            <p class="text-[10px] text-slate-500 mt-2">Net platform revenue</p>
          </div>
        </div>
      }

      <!-- Filtered Data Table Preview -->
      <div class="card border-none ring-1 ring-slate-100 dark:ring-white/5 !p-0 overflow-hidden">
        <div class="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-white/5">
          <h3 class="font-bold text-[#1A1A1A] dark:text-white">Filtered Orders Preview</h3>
          <span class="text-xs font-bold text-slate-500 bg-white dark:bg-[#1E293B] px-2 py-1 rounded-md border border-slate-200 dark:border-white/10">{{ filteredOrders().length }} Orders</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-white dark:bg-[#1E293B] border-b border-slate-100 dark:border-white/5">
                <th class="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Order ID</th>
                <th class="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</th>
                <th class="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Merchant</th>
                <th class="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th class="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Amount</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-white/5 bg-white dark:bg-[#1E293B]">
              @for (order of filteredOrders().slice(0, 5); track order.id) {
                <tr class="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <td class="px-4 py-3 text-sm font-bold text-[#1A1A1A] dark:text-white">{{ order.order_number }}</td>
                  <td class="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{{ order.created_at | date:'shortDate' }}</td>
                  <td class="px-4 py-3 text-sm text-[#1A1A1A] dark:text-white">{{ order.hotel_name }}</td>
                  <td class="px-4 py-3">
                    <span class="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md border"
                      [ngClass]="{
                        'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20': order.status === 'delivered',
                        'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:border-red-500/20': order.status === 'cancelled',
                        'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20': order.status === 'in-progress' || order.status === 'placed'
                      }">
                      {{ order.status }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-sm font-bold text-[#1A1A1A] dark:text-white text-right">₹{{ (order.grand_total || 0).toLocaleString() }}</td>
                </tr>
              }
              @if (filteredOrders().length === 0) {
                <tr>
                  <td colspan="5" class="px-4 py-8 text-center text-slate-500 dark:text-slate-400 text-sm">No orders match the selected filters.</td>
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
export class Reports implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private catalog = inject(CatalogService);
  
  orders = signal<Order[]>([]);
  
  // Filters
  startDate = signal<string>('');
  endDate = signal<string>('');
  statusFilter = signal<string>('all');
  merchantFilter = signal<string>('all');

  uniqueMerchants = computed(() => {
    return this.catalog.merchants().sort((a, b) => a.name.localeCompare(b.name));
  });

  filteredOrders = computed(() => {
    let result = this.orders();
    
    const start = this.startDate();
    const end = this.endDate();
    const status = this.statusFilter();
    const merchantId = this.merchantFilter();

    if (start) {
      const startDate = new Date(start).getTime();
      result = result.filter(o => o.created_at && new Date(o.created_at).getTime() >= startDate);
    }
    
    if (end) {
      const endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999);
      result = result.filter(o => o.created_at && new Date(o.created_at).getTime() <= endDate.getTime());
    }

    if (status !== 'all') {
      result = result.filter(o => o.status === status);
    }

    if (merchantId !== 'all') {
      const id = parseInt(merchantId);
      result = result.filter(o => o.hotel_id === id);
    }

    return result;
  });

  metrics = computed(() => {
    const data = this.filteredOrders();
    const hotels = this.catalog.merchants();
    
    let totalHotelEarnings = 0;
    let totalDeliverySalary = 0;
    let totalAdminCommission = 0;
    
    if (data && hotels) {
      data.forEach(o => {
        const hotel = hotels.find(h => h.id === o.hotel_id);
        const commissionRate = hotel?.commission_rate || 15; // Default to 15% if not found
        
        const adminComm = Math.round((o.subtotal || 0) * (commissionRate / 100));
        const deliveryFee = o.shipping_fee || 0;
        const hotelEarn = (o.subtotal || 0) - adminComm;
        
        totalHotelEarnings += hotelEarn;
        totalDeliverySalary += deliveryFee;
        totalAdminCommission += adminComm;
      });
    }
    
    return {
      hotelEarnings: totalHotelEarnings,
      deliverySalary: totalDeliverySalary,
      adminCommission: totalAdminCommission
    };
  });

  ngOnInit() {
    this.api.getOrders().subscribe({
      next: (d) => {
        console.log('Orders fetched:', d);
        this.orders.set(d);
      },
      error: (err) => console.error('Failed to fetch orders:', err)
    });
  }

  resetFilters() {
    this.startDate.set('');
    this.endDate.set('');
    this.statusFilter.set('all');
    this.merchantFilter.set('all');
    this.toast.info('Filters reset');
  }

  exportCSV() {
    const data = this.filteredOrders();
    if (data.length === 0) {
      this.toast.error('No data to export');
      return;
    }

    const headers = ['Order ID', 'Date', 'Merchant', 'Customer', 'Status', 'Subtotal', 'Shipping', 'Total'];
    const rows = data.map(o => [
      o.order_number || '',
      o.created_at ? new Date(o.created_at).toLocaleDateString() : '',
      o.hotel_name || '',
      o.customer_name || '',
      o.status || '',
      (o.subtotal || 0).toString(),
      (o.shipping_fee || 0).toString(),
      (o.grand_total || 0).toString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `kallme_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.toast.success('CSV exported successfully');
  }

  exportPDF() {
    const data = this.filteredOrders();
    if (data.length === 0) {
      this.toast.error('No data to export');
      return;
    }

    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.text('Kall Me - Financial Report', 14, 22);
    
    // Filters info
    doc.setFontSize(10);
    doc.setTextColor(100);
    let filterText = `Generated on: ${new Date().toLocaleDateString()}`;
    if (this.startDate() || this.endDate()) {
      filterText += ` | Period: ${this.startDate() || 'Start'} to ${this.endDate() || 'End'}`;
    }
    if (this.statusFilter() !== 'all') filterText += ` | Status: ${this.statusFilter()}`;
    if (this.merchantFilter() !== 'all') filterText += ` | Merchant: ${this.merchantFilter()}`;
    doc.text(filterText, 14, 30);

    // Metrics summary
    const m = this.metrics();
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Summary:`, 14, 40);
    doc.setFontSize(10);
    doc.text(`Hotel Earnings: Rs. ${(m.hotelEarnings || 0).toLocaleString()}`, 14, 46);
    doc.text(`Delivery Salary: Rs. ${(m.deliverySalary || 0).toLocaleString()}`, 14, 52);
    doc.text(`Admin Commission: Rs. ${(m.adminCommission || 0).toLocaleString()}`, 14, 58);

    // Table
    const headers = [['Order ID', 'Date', 'Merchant', 'Status', 'Total']];
    const rows = data.map(o => [
      o.order_number || '',
      o.created_at ? new Date(o.created_at).toLocaleDateString() : '',
      o.hotel_name || '',
      o.status || '',
      `Rs. ${(o.grand_total || 0).toLocaleString()}`
    ]);

    autoTable(doc, {
      startY: 65,
      head: headers,
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [255, 193, 7], textColor: [0, 0, 0] },
      styles: { fontSize: 8 }
    });

    doc.save(`kallme_report_${new Date().toISOString().split('T')[0]}.pdf`);
    
    this.toast.success('PDF exported successfully');
  }
}

