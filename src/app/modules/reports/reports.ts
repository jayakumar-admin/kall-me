import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { ECharts, EChartsOption } from 'echarts';
import { NgxEchartsDirective } from 'ngx-echarts';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { Order } from '../../models';
import { CatalogService } from '../../services/catalog.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, NgxEchartsDirective],
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

      <!-- Tabs -->
      <div class="flex items-center justify-between border-b border-slate-200 dark:border-white/10">
        <div class="flex">
          @for (tab of tabs; track tab) {
            <button (click)="currentTab.set(tab)" [class.border-[#FFC107]]="currentTab() === tab" class="px-4 py-2 border-b-2 font-bold text-sm transition-colors" [class.text-[#FFC107]]="currentTab() === tab" [class.text-slate-500]="currentTab() !== tab">
              {{ tab }}
            </button>
          }
        </div>
        <div class="flex gap-2">
          @for (sub of subTabs; track sub) {
            <button (click)="currentSubTab.set(sub)" [class.bg-[#FFC107]]="currentSubTab() === sub" class="px-3 py-1 rounded-md text-xs font-bold transition-colors" [class.text-black]="currentSubTab() === sub" [class.text-slate-500]="currentSubTab() !== sub">
              {{ sub }}
            </button>
          }
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
            <label for="hotelFilter" class="text-xs font-bold text-slate-500 mb-2 block">Hotel</label>
            <select id="hotelFilter" [ngModel]="hotelFilter()" (ngModelChange)="hotelFilter.set($event)" class="input-field py-2 text-sm appearance-none">
              <option value="all">All Hotels</option>
              @for (hotel of uniqueHotels(); track hotel.id) {
                <option [value]="hotel.id">{{ hotel.name }}</option>
              }
            </select>
          </div>
        </div>
      </div>

      <!-- Metrics -->
      @if (loading()) {
        <div class="py-12 text-center text-slate-500 flex flex-col items-center">
          <mat-icon class="animate-spin text-4xl mb-2">refresh</mat-icon>
          <p>Loading reports...</p>
        </div>
      } @else if (orders().length === 0) {
        <div class="py-12 text-center text-slate-500 flex flex-col items-center">
          <mat-icon class="text-4xl mb-4 opacity-50">search_off</mat-icon>
          <p>No orders found.</p>
        </div>
      } @else {
        @if (currentTab() === 'Master Chart View') {
          <div class="flex justify-end mb-4">
            <select [ngModel]="chartType()" (ngModelChange)="chartType.set($event)" class="input-field py-1 px-2 text-xs appearance-none w-32">
              <option value="bar">Bar Chart</option>
              <option value="line">Line Chart</option>
              <option value="pie">Pie Chart</option>
              <option value="area">Area Chart</option>
              <option value="scatter">Scatter Chart</option>
              <option value="doughnut">Doughnut Chart</option>
            </select>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="card border-none ring-1 ring-slate-100 dark:ring-white/5">
              <h3 class="font-bold text-[#1A1A1A] dark:text-white mb-4">Overview Analytics</h3>
              <div echarts [options]="getChartOptions('Overview')" class="h-80"></div>
            </div>
            <div class="card border-none ring-1 ring-slate-100 dark:ring-white/5">
              <h3 class="font-bold text-[#1A1A1A] dark:text-white mb-4">Hotel-wise Analytics</h3>
              <div echarts [options]="getChartOptions('Hotel-wise')" class="h-80"></div>
            </div>
            <div class="card border-none ring-1 ring-slate-100 dark:ring-white/5">
              <h3 class="font-bold text-[#1A1A1A] dark:text-white mb-4">Delivery Person-wise Analytics</h3>
              <div echarts [options]="getChartOptions('Delivery Man-wise')" class="h-80"></div>
            </div>
            <div class="card border-none ring-1 ring-slate-100 dark:ring-white/5">
              <h3 class="font-bold text-[#1A1A1A] dark:text-white mb-4">Menu-wise Analytics</h3>
              <div echarts [options]="getChartOptions('Menu-wise')" class="h-80"></div>
            </div>
            <div class="card border-none ring-1 ring-slate-100 dark:ring-white/5">
              <h3 class="font-bold text-[#1A1A1A] dark:text-white mb-4">Orders Analytics</h3>
              <div echarts [options]="getChartOptions('Orders')" class="h-80"></div>
            </div>
            <div class="card border-none ring-1 ring-slate-100 dark:ring-white/5">
              <h3 class="font-bold text-[#1A1A1A] dark:text-white mb-4">Commission / Earnings Analytics</h3>
              <div echarts [options]="getChartOptions('Commission / Earnings')" class="h-80"></div>
            </div>
            <div class="card border-none ring-1 ring-slate-100 dark:ring-white/5">
              <h3 class="font-bold text-[#1A1A1A] dark:text-white mb-4">Top Performing Hotels</h3>
              <div echarts [options]="getChartOptions('Top Performing Hotels')" class="h-80"></div>
            </div>
            <div class="card border-none ring-1 ring-slate-100 dark:ring-white/5">
              <h3 class="font-bold text-[#1A1A1A] dark:text-white mb-4">Top Selling Menus</h3>
              <div echarts [options]="getChartOptions('Top Selling Menus')" class="h-80"></div>
            </div>
            <div class="card border-none ring-1 ring-slate-100 dark:ring-white/5">
              <h3 class="font-bold text-[#1A1A1A] dark:text-white mb-4">Time-of-Day Analytics</h3>
              <div echarts [options]="getChartOptions('Time-of-Day')" class="h-80"></div>
            </div>
            <div class="card border-none ring-1 ring-slate-100 dark:ring-white/5">
              <h3 class="font-bold text-[#1A1A1A] dark:text-white mb-4">Status-wise Analytics</h3>
              <div echarts [options]="getChartOptions('Status-wise')" class="h-80"></div>
            </div>
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            @for (item of metrics().items; track item.label) {
              <div class="card border-none ring-1 ring-slate-100 dark:ring-white/5">
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{{ item.label }}</p>
                <p class="text-2xl font-black text-[#1A1A1A] dark:text-white">{{ item.value }}</p>
              </div>
            }
          </div>
          
          @if (currentSubTab() === 'Chart') {
            <!-- Charts -->
            <div class="card border-none ring-1 ring-slate-100 dark:ring-white/5">
              <div class="flex justify-between items-center mb-4">
                <h3 class="font-bold text-[#1A1A1A] dark:text-white">{{ currentTab() }} Analytics</h3>
                <div class="flex gap-2">
                  <select [ngModel]="chartType()" (ngModelChange)="chartType.set($event)" class="input-field py-1 px-2 text-xs appearance-none">
                    <option value="bar">Bar Chart</option>
                    <option value="line">Line Chart</option>
                    <option value="pie">Pie Chart</option>
                    <option value="area">Area Chart</option>
                    <option value="scatter">Scatter Chart</option>
                    <option value="doughnut">Doughnut Chart</option>
                  </select>
                  <button (click)="downloadChart()" class="text-xs font-bold text-[#FFC107] hover:text-[#E6AE06] transition-colors flex items-center gap-1">
                    <mat-icon class="text-sm">download</mat-icon>
                    Download Chart
                  </button>
                </div>
              </div>
              <div echarts [options]="chartOptions()" class="h-80" (chartInit)="onChartInit($event)"></div>
            </div>
          } @else {
            <!-- Filtered Data Table -->
            <div class="card border-none ring-1 ring-slate-100 dark:ring-white/5 !p-0 overflow-hidden">
              <div class="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-white/5">
                <h3 class="font-bold text-[#1A1A1A] dark:text-white">{{ currentTab() }} Data</h3>
                <span class="text-xs font-bold text-slate-500 bg-white dark:bg-[#1E293B] px-2 py-1 rounded-md border border-slate-200 dark:border-white/10">{{ filteredOrders().length }} Records</span>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr [class]="tableConfig().headerColor" class="border-b border-slate-100 dark:border-white/5">
                      @for (header of tableConfig().headers; track header) {
                        <th class="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider" [class.text-right]="header === 'Amount' || header === 'Earnings'">{{ header }}</th>
                      }
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 dark:divide-white/5 bg-white dark:bg-[#1E293B]">
                    @for (row of tableConfig().rows; track row) {
                      <tr class="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                        @for (cell of row; track cell) {
                          <td class="px-4 py-3 text-sm font-bold text-[#1A1A1A] dark:text-white" [class.text-right]="cell.toString().startsWith('₹')">{{ cell }}</td>
                        }
                      </tr>
                    }
                    @if (tableConfig().rows.length === 0) {
                      <tr>
                        <td [attr.colspan]="tableConfig().headers.length" class="px-4 py-8 text-center text-slate-500 dark:text-slate-400 text-sm">No records match the selected filters.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Reports implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private catalog = inject(CatalogService);
  
  orders = signal<Order[]>([]);
  loading = signal(true);
  
  // Tabs
  tabs = [
    'Overview', 
    'Master Chart View',
    'Hotel-wise', 
    'Delivery Person-wise', 
    'Menu-wise', 
    'Orders', 
    'Commission / Earnings', 
    'Top Performing Hotels', 
    'Top Selling Menus',
    'Time-of-Day',
    'Status-wise'
  ];
  currentTab = signal('Overview');
  subTabs = ['Chart', 'Table'];
  currentSubTab = signal('Table');
  chartType = signal<'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'doughnut'>('bar');

  // Reset sub-tab when main tab changes
  constructor() {
    effect(() => {
      this.currentTab();
      this.currentSubTab.set('Table');
    });
  }

  // Filters
  startDate = signal<string>('');
  endDate = signal<string>('');
  statusFilter = signal<string>('all');
  hotelFilter = signal<string>('all');

  uniqueHotels = computed(() => {
    return this.catalog.hotels().sort((a, b) => a.name.localeCompare(b.name));
  });

  filteredOrders = computed(() => {
    let result = this.orders();
    
    const start = this.startDate();
    const end = this.endDate();
    const status = this.statusFilter();
    const hotelId = this.hotelFilter();

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

    if (hotelId !== 'all') {
      const id = parseInt(hotelId);
      result = result.filter(o => o.hotel_id === id);
    }

    return result;
  });

  tableConfig = computed(() => {
    const tab = this.currentTab();
    if (tab === 'Hotel-wise') {
      return {
        headers: ['Hotel', 'Orders', 'Revenue', 'Avg Order'],
        rows: Object.values(this.groupedByHotel()).map(g => [g.name, g.orders, `₹${g.revenue.toLocaleString()}`, `₹${Math.round(g.revenue / g.orders).toLocaleString()}`]),
        headerColor: 'bg-indigo-50 dark:bg-indigo-900/20'
      };
    } else if (tab === 'Delivery Man-wise') {
      return {
        headers: ['Delivery Person', 'Orders', 'Earnings'],
        rows: Object.values(this.groupedByDelivery()).map(g => [g.name, g.orders, `₹${g.earnings.toLocaleString()}`]),
        headerColor: 'bg-emerald-50 dark:bg-emerald-900/20'
      };
    } else if (tab === 'Menu-wise') {
      return {
        headers: ['Menu Item', 'Quantity', 'Revenue'],
        rows: Object.values(this.groupedByMenu()).map(g => [g.name, g.quantity, `₹${g.revenue.toLocaleString()}`]),
        headerColor: 'bg-amber-50 dark:bg-amber-900/20'
      };
    } else if (tab === 'Time-of-Day') {
      const grouped: Record<string, number> = {};
      this.filteredOrders().forEach(o => {
        if (o.created_at) {
          const hour = new Date(o.created_at).getHours();
          const label = `${hour}:00 - ${hour + 1}:00`;
          grouped[label] = (grouped[label] || 0) + 1;
        }
      });
      const sorted = Object.entries(grouped).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
      return {
        headers: ['Time of Day', 'Orders'],
        rows: sorted.map(g => [g[0], g[1]]),
        headerColor: 'bg-blue-50 dark:bg-blue-900/20'
      };
    } else if (tab === 'Status-wise') {
      const grouped: Record<string, number> = {};
      this.filteredOrders().forEach(o => {
        const status = o.status || 'Unknown';
        grouped[status] = (grouped[status] || 0) + (Number(o.grand_total) || 0);
      });
      return {
        headers: ['Order Status', 'Revenue'],
        rows: Object.entries(grouped).map(g => [g[0], `₹${g[1].toLocaleString()}`]),
        headerColor: 'bg-purple-50 dark:bg-purple-900/20'
      };
    } else {
      return {
        headers: ['Order ID', 'Date', 'Hotel', 'Status', 'Amount'],
        rows: this.filteredOrders().map(o => [
          o.order_number || '',
          o.created_at ? new Date(o.created_at).toLocaleDateString() : '',
          o.hotel_name || '',
          o.status || '',
          `₹${(o.grand_total || 0).toLocaleString()}`
        ]),
        headerColor: 'bg-slate-50 dark:bg-slate-900/20'
      };
    }
  });

  groupedByHotel = computed(() => {
    const grouped: Record<number, { name: string, orders: number, revenue: number }> = {};
    this.filteredOrders().forEach(o => {
      if (!grouped[o.hotel_id]) grouped[o.hotel_id] = { name: o.hotel_name || 'Unknown', orders: 0, revenue: 0 };
      grouped[o.hotel_id].orders++;
      grouped[o.hotel_id].revenue += Number(o.grand_total) || 0;
    });
    return grouped;
  });

  groupedByDelivery = computed(() => {
    const grouped: Record<number, { name: string, orders: number, earnings: number }> = {};
    this.filteredOrders().forEach(o => {
      if (!grouped[o.delivery_person_id]) grouped[o.delivery_person_id] = { name: o.delivery_person_name || 'Unknown', orders: 0, earnings: 0 };
      grouped[o.delivery_person_id].orders++;
      grouped[o.delivery_person_id].earnings += Number(o.shipping_fee) || 0;
    });
    return grouped;
  });

  groupedByMenu = computed(() => {
    const grouped: Record<number, { name: string, quantity: number, revenue: number }> = {};
    this.filteredOrders().forEach(o => {
      (o.items || []).forEach(item => {
        if (!grouped[item.menu_id]) grouped[item.menu_id] = { name: item.menu_name || 'Unknown', quantity: 0, revenue: 0 };
        grouped[item.menu_id].quantity += Number(item.quantity) || 0;
        grouped[item.menu_id].revenue += Number(item.total) || 0;
      });
    });
    return grouped;
  });

  metrics = computed(() => {
    const data = this.filteredOrders();
    const tab = this.currentTab();
    
    if (tab === 'Overview') {
      const hotels = this.catalog.hotels();
      let totalHotelEarnings = 0;
      let totalDeliverySalary = 0;
      let totalAdminCommission = 0;
      
      data.forEach(o => {
        const hotel = hotels.find(h => h.id === o.hotel_id);
        const commissionRate = hotel?.commission_rate || 15;
        const adminComm = Math.round((Number(o.subtotal) || 0) * (commissionRate / 100));
        const deliveryFee = Number(o.shipping_fee) || 0;
        const hotelEarn = (Number(o.subtotal) || 0) - adminComm;
        
        totalHotelEarnings += hotelEarn;
        totalDeliverySalary += deliveryFee;
        totalAdminCommission += adminComm;
      });
      return {
        type: 'Overview',
        items: [
          { label: 'Hotel Earnings', value: `₹${totalHotelEarnings.toLocaleString()}` },
          { label: 'Delivery Salary', value: `₹${totalDeliverySalary.toLocaleString()}` },
          { label: 'Admin Commission', value: `₹${totalAdminCommission.toLocaleString()}` }
        ]
      };
    } else if (tab === 'Hotel-wise') {
      const grouped: Record<number, { name: string, orders: number, revenue: number }> = {};
      data.forEach(o => {
        if (!grouped[o.hotel_id]) grouped[o.hotel_id] = { name: o.hotel_name || 'Unknown', orders: 0, revenue: 0 };
        grouped[o.hotel_id].orders++;
        grouped[o.hotel_id].revenue += Number(o.grand_total) || 0;
      });
      return {
        type: 'Hotel-wise',
        items: Object.values(grouped).map(g => ({
          label: g.name,
          value: `Orders: ${g.orders} | Rev: ₹${g.revenue.toLocaleString()} | Avg: ₹${Math.round(g.revenue / g.orders).toLocaleString()}`
        }))
      };
    } else if (tab === 'Delivery Man-wise') {
      const grouped: Record<number, { name: string, orders: number, earnings: number }> = {};
      data.forEach(o => {
        if (!grouped[o.delivery_person_id]) grouped[o.delivery_person_id] = { name: o.delivery_person_name || 'Unknown', orders: 0, earnings: 0 };
        grouped[o.delivery_person_id].orders++;
        grouped[o.delivery_person_id].earnings += Number(o.shipping_fee) || 0;
      });
      return {
        type: 'Delivery Man-wise',
        items: Object.values(grouped).map(g => ({
          label: g.name,
          value: `Orders: ${g.orders} | Earnings: ₹${g.earnings.toLocaleString()}`
        }))
      };
    } else if (tab === 'Menu-wise') {
      const grouped: Record<number, { name: string, quantity: number, revenue: number }> = {};
      data.forEach(o => {
        (o.items || []).forEach(item => {
          if (!grouped[item.menu_id]) grouped[item.menu_id] = { name: item.menu_name || 'Unknown', quantity: 0, revenue: 0 };
          grouped[item.menu_id].quantity += Number(item.quantity) || 0;
          grouped[item.menu_id].revenue += Number(item.total) || 0;
        });
      });
      return {
        type: 'Menu-wise',
        items: Object.values(grouped).map(g => ({
          label: g.name,
          value: `Qty: ${g.quantity} | Rev: ₹${g.revenue.toLocaleString()}`
        }))
      };
    } else if (tab === 'Orders') {
      return {
        type: 'Orders',
        items: [
          { label: 'Total Orders', value: data.length.toString() },
          { label: 'Total Revenue', value: `₹${data.reduce((sum, o) => sum + (Number(o.grand_total) || 0), 0).toLocaleString()}` }
        ]
      };
    } else if (tab === 'Commission / Earnings') {
      const totalComm = data.reduce((sum, o) => {
        const hotel = this.catalog.hotels().find(h => h.id === o.hotel_id);
        const rate = hotel?.commission_rate || 15;
        return sum + Math.round((Number(o.subtotal) || 0) * (rate / 100));
      }, 0);
      return {
        type: 'Commission / Earnings',
        items: [
          { label: 'Total Commission', value: `₹${totalComm.toLocaleString()}` }
        ]
      };
    } else if (tab === 'Top Performing Hotels') {
      const grouped: Record<number, { name: string, revenue: number }> = {};
      data.forEach(o => {
        if (!grouped[o.hotel_id]) grouped[o.hotel_id] = { name: o.hotel_name || 'Unknown', revenue: 0 };
        grouped[o.hotel_id].revenue += Number(o.grand_total) || 0;
      });
      return {
        type: 'Top Performing Hotels',
        items: Object.values(grouped)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5)
          .map(g => ({ label: g.name, value: `₹${g.revenue.toLocaleString()}` }))
      };
    } else if (tab === 'Top Selling Menus') {
      const grouped: Record<number, { name: string, quantity: number }> = {};
      data.forEach(o => {
        (o.items || []).forEach(item => {
          if (!grouped[item.menu_id]) grouped[item.menu_id] = { name: item.menu_name || 'Unknown', quantity: 0 };
          grouped[item.menu_id].quantity += item.quantity;
        });
      });
      return {
        type: 'Top Selling Menus',
        items: Object.values(grouped)
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 5)
          .map(g => ({ label: g.name, value: `Qty: ${g.quantity}` }))
      };
    } else if (tab === 'Time-of-Day') {
      const grouped: Record<string, number> = {};
      data.forEach(o => {
        if (o.created_at) {
          const hour = new Date(o.created_at).getHours();
          const label = `${hour}:00 - ${hour + 1}:00`;
          grouped[label] = (grouped[label] || 0) + 1;
        }
      });
      return {
        type: 'Time-of-Day',
        items: Object.entries(grouped).map(g => ({
          label: g[0],
          value: `Orders: ${g[1]}`
        }))
      };
    } else if (tab === 'Status-wise') {
      const grouped: Record<string, number> = {};
      data.forEach(o => {
        const status = o.status || 'Unknown';
        grouped[status] = (grouped[status] || 0) + (Number(o.grand_total) || 0);
      });
      return {
        type: 'Status-wise',
        items: Object.entries(grouped).map(g => ({
          label: g[0],
          value: `Rev: ₹${g[1].toLocaleString()}`
        }))
      };
    }
    return { type: 'Other', items: [] };
  });

  chartOptions = computed(() => {
    return this.getChartOptions(this.currentTab());
  });

  getChartOptions(tab: string): EChartsOption {
    const data = this.filteredOrders();
    const type = this.chartType();
    
    let xAxisData: string[] = [];
    let seriesData: number[] = [];
    
    if (tab === 'Overview') {
      // Group by date
      const grouped: Record<string, number> = {};
      data.forEach(o => {
        const date = o.created_at ? new Date(o.created_at).toLocaleDateString() : 'Unknown';
        grouped[date] = (grouped[date] || 0) + (Number(o.grand_total) || 0);
      });
      xAxisData = Object.keys(grouped);
      seriesData = Object.values(grouped);
    } else if (tab === 'Hotel-wise') {
      // Group by hotel
      const grouped: Record<string, number> = {};
      data.forEach(o => {
        const hotel = o.hotel_name || 'Unknown';
        grouped[hotel] = (grouped[hotel] || 0) + (Number(o.grand_total) || 0);
      });
      xAxisData = Object.keys(grouped);
      seriesData = Object.values(grouped);
    } else if (tab === 'Delivery Man-wise') {
      // Group by delivery person
      const grouped: Record<string, number> = {};
      data.forEach(o => {
        const person = o.delivery_person_name || 'Unknown';
        grouped[person] = (grouped[person] || 0) + (Number(o.grand_total) || 0);
      });
      xAxisData = Object.keys(grouped);
      seriesData = Object.values(grouped);
    } else if (tab === 'Menu-wise') {
      const grouped: Record<string, number> = {};
      data.forEach(o => {
        (o.items || []).forEach(item => {
          const name = item.menu_name || 'Unknown';
          grouped[name] = (grouped[name] || 0) + (Number(item.total) || 0);
        });
      });
      xAxisData = Object.keys(grouped);
      seriesData = Object.values(grouped);
    } else if (tab === 'Orders') {
      const grouped: Record<string, number> = {};
      data.forEach(o => {
        const date = o.created_at ? new Date(o.created_at).toLocaleDateString() : 'Unknown';
        grouped[date] = (grouped[date] || 0) + 1;
      });
      xAxisData = Object.keys(grouped);
      seriesData = Object.values(grouped);
    } else if (tab === 'Commission / Earnings') {
      const grouped: Record<string, number> = {};
      data.forEach(o => {
        const hotel = this.catalog.hotels().find(h => h.id === o.hotel_id);
        const rate = hotel?.commission_rate || 15;
        const comm = Math.round((Number(o.subtotal) || 0) * (rate / 100));
        const date = o.created_at ? new Date(o.created_at).toLocaleDateString() : 'Unknown';
        grouped[date] = (grouped[date] || 0) + comm;
      });
      xAxisData = Object.keys(grouped);
      seriesData = Object.values(grouped);
    } else if (tab === 'Top Performing Hotels') {
      const grouped: Record<string, number> = {};
      data.forEach(o => {
        const hotel = o.hotel_name || 'Unknown';
        grouped[hotel] = (grouped[hotel] || 0) + (Number(o.grand_total) || 0);
      });
      const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1]).slice(0, 5);
      xAxisData = sorted.map(e => e[0]);
      seriesData = sorted.map(e => e[1]);
    } else if (tab === 'Top Selling Menus') {
      const grouped: Record<string, number> = {};
      data.forEach(o => {
        (o.items || []).forEach(item => {
          const name = item.menu_name || 'Unknown';
          grouped[name] = (grouped[name] || 0) + item.quantity;
        });
      });
      const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1]).slice(0, 5);
      xAxisData = sorted.map(e => e[0]);
      seriesData = sorted.map(e => e[1]);
    } else if (tab === 'Time-of-Day') {
      const grouped: Record<string, number> = {};
      data.forEach(o => {
        if (o.created_at) {
          const hour = new Date(o.created_at).getHours();
          const label = `${hour}:00 - ${hour + 1}:00`;
          grouped[label] = (grouped[label] || 0) + 1;
        }
      });
      const sorted = Object.entries(grouped).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
      xAxisData = sorted.map(e => e[0]);
      seriesData = sorted.map(e => e[1]);
    } else if (tab === 'Status-wise') {
      const grouped: Record<string, number> = {};
      data.forEach(o => {
        const status = o.status || 'Unknown';
        grouped[status] = (grouped[status] || 0) + (Number(o.grand_total) || 0);
      });
      xAxisData = Object.keys(grouped);
      seriesData = Object.values(grouped);
    }

    if (type === 'pie') {
      const pieData = xAxisData.map((name, index) => ({ name, value: seriesData[index] }));
      return {
        title: { text: `${tab} Report`, left: 'center' },
        tooltip: { trigger: 'item' as const },
        series: [{ data: pieData, type: 'pie', radius: '50%' }]
      };
    } else if (type === 'doughnut') {
      const pieData = xAxisData.map((name, index) => ({ name, value: seriesData[index] }));
      return {
        title: { text: `${tab} Report`, left: 'center' },
        tooltip: { trigger: 'item' as const },
        series: [{ data: pieData, type: 'pie', radius: ['40%', '70%'] }]
      };
    } else if (type === 'area') {
      return {
        title: { text: `${tab} Report`, left: 'center' },
        tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' } },
        xAxis: { type: 'category' as const, data: xAxisData, axisLabel: { rotate: 45 } },
        yAxis: { type: 'value' },
        series: [{ data: seriesData, type: 'line', areaStyle: {}, itemStyle: { color: '#FFC107' }, smooth: true }]
      };
    } else if (type === 'scatter') {
      return {
        title: { text: `${tab} Report`, left: 'center' },
        tooltip: { trigger: 'item' as const },
        xAxis: { type: 'category' as const, data: xAxisData, axisLabel: { rotate: 45 } },
        yAxis: { type: 'value' },
        series: [{ data: seriesData, type: 'scatter', itemStyle: { color: '#FFC107' } }]
      };
    } else {
      return {
        title: { text: `${tab} Report`, left: 'center' },
        tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' } },
        xAxis: { type: 'category' as const, data: xAxisData, axisLabel: { rotate: 45 } },
        yAxis: { type: 'value' },
        series: [{ data: seriesData, type: type, itemStyle: { color: '#FFC107' }, smooth: true }]
      };
    }
  }

  private chartInstance: ECharts | null = null;

  onChartInit(ec: unknown) {
    this.chartInstance = ec as ECharts;
  }

  downloadChart() {
    if (this.chartInstance) {
      const url = this.chartInstance.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#fff'
      });
      const link = document.createElement('a');
      link.href = url;
      link.download = `chart_${this.currentTab()}_${new Date().toISOString().split('T')[0]}.png`;
      link.click();
      this.toast.success('Chart downloaded successfully');
    }
  }

  ngOnInit() {
    this.loading.set(true);
    this.api.getOrders().subscribe({
      next: (d) => {
        console.log('Orders fetched:', d);
        this.orders.set(d);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to fetch orders:', err);
        this.loading.set(false);
      }
    });
  }

  resetFilters() {
    this.startDate.set('');
    this.endDate.set('');
    this.statusFilter.set('all');
    this.hotelFilter.set('all');
    this.toast.info('Filters reset');
  }

  exportCSV() {
    const config = this.tableConfig();
    if (config.rows.length === 0) {
      this.toast.error('No data to export');
      return;
    }

    const headers = config.headers;
    const rows = config.rows;

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `kallme_report_${this.currentTab()}_${new Date().toISOString().split('T')[0]}.csv`);
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
    if (this.hotelFilter() !== 'all') filterText += ` | Hotel: ${this.hotelFilter()}`;
    doc.text(filterText, 14, 30);

    // Metrics summary
    const m = this.metrics();
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Summary:`, 14, 40);
    doc.setFontSize(10);
    
    // Display items from the metrics object instead of hardcoded properties
    let y = 46;
    m.items.forEach(item => {
      doc.text(`${item.label}: ${item.value}`, 14, y);
      y += 6;
    });

    // Table
    const headers = [['Order ID', 'Date', 'Hotel', 'Status', 'Total']];
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

