import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SearchService } from '../../services/search.service';
import { ToastService } from '../../services/toast.service';
import { OrderService } from '../../services/order.service';
import { Order } from '../../models';

import { MainSkeletonComponent } from '../../components/main-skeleton';

@Component({
  selector: 'app-orders-list',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, RouterLink, MainSkeletonComponent],
  template: `
    @if (orderService.loading()) {
      <app-main-skeleton />
    } @else {
      <div class="h-full overflow-y-auto p-6 custom-scrollbar space-y-8">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 class="text-3xl font-display font-black text-[#1A1A1A] dark:text-white uppercase tracking-tight">Orders Management</h1>
            <p class="text-slate-500 dark:text-slate-400">Real-time tracking of food deliveries and payment balances.</p>
          </div>
          <div class="flex gap-3">
            <div class="relative">
              <select 
                [(ngModel)]="statusFilter"
                class="appearance-none px-4 py-2.5 pr-10 rounded-xl bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-white/5 text-[#1A1A1A] dark:text-white font-bold text-sm shadow-sm outline-none focus:ring-2 focus:ring-[#FFC107]/20 cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="placed">Placed</option>
                <option value="in-progress">In Progress</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <mat-icon class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</mat-icon>
            </div>
            <button (click)="exportOrders()" class="px-4 py-2.5 rounded-xl bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-400 font-bold text-sm flex items-center gap-2 shadow-sm hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
              <mat-icon class="text-lg">file_download</mat-icon>
              Export
            </button>
          </div>
        </div>

        <!-- Stats Row -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="card border-none ring-1 ring-slate-100 dark:ring-white/5">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Orders</p>
            <p class="text-2xl font-black text-[#1A1A1A] dark:text-white">{{ orderService.stats().total }}</p>
          </div>
          <div class="card border-none ring-1 ring-slate-100 dark:ring-white/5">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Revenue</p>
            <p class="text-2xl font-black text-[#1A1A1A] dark:text-white">₹{{ orderService.stats().revenue.toLocaleString() }}</p>
          </div>
          <div class="card border-none ring-1 ring-slate-100 dark:ring-white/5">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Received</p>
            <p class="text-2xl font-black text-emerald-500">₹{{ orderService.stats().received.toLocaleString() }}</p>
          </div>
          <div class="card border-none ring-1 ring-slate-100 dark:ring-white/5">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Balance Pending</p>
            <p class="text-2xl font-black text-red-500">₹{{ orderService.stats().pending.toLocaleString() }}</p>
          </div>
        </div>

        <!-- Orders Table -->
        <div class="card !p-0 overflow-hidden border-none ring-1 ring-slate-100 dark:ring-white/5">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                  <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Order ID</th>
                  <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer</th>
                  <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Merchant</th>
                  <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Bill</th>
                  <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Received</th>
                  <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending</th>
                  <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-white/5">
                @for (order of filteredOrders(); track order.id) {
                  <tr class="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <td class="px-6 py-4">
                      <p class="font-bold text-[#1A1A1A] dark:text-white">{{ order.order_number }}</p>
                      <p class="text-[10px] text-slate-400 uppercase">{{ order.created_at | date:'short' }}</p>
                    </td>
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-[#FFC107]/10 flex items-center justify-center text-[#FFC107] shrink-0">
                          <mat-icon class="text-sm">person</mat-icon>
                        </div>
                        <div>
                          <p class="text-sm font-bold text-[#1A1A1A] dark:text-white">{{ order.customer_name }}</p>
                          <p class="text-[10px] text-slate-400">{{ order.delivery_address }}</p>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <mat-icon class="text-[#FFC107] text-sm">storefront</mat-icon>
                        <span class="text-sm font-medium">{{ order.hotel_name }}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4 font-bold text-[#1A1A1A] dark:text-white">₹{{ order.grand_total.toLocaleString() }}</td>
                    <td class="px-6 py-4 font-bold text-emerald-500">₹{{ order.amount_received.toLocaleString() }}</td>
                    <td class="px-6 py-4 font-bold text-red-500">₹{{ order.balance_pending.toLocaleString() }}</td>
                    <td class="px-6 py-4">
                      <div class="relative inline-block">
                        <select 
                          [ngModel]="order.status"
                          (ngModelChange)="updateStatus(order, $event)"
                          [class]="getStatusClass(order.status || 'placed')"
                          class="appearance-none px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider outline-none cursor-pointer pr-6"
                        >
                          <option value="placed">Placed</option>
                          <option value="in-progress">In Progress</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <mat-icon class="absolute right-1 top-1/2 -translate-y-1/2 text-[12px] opacity-50 pointer-events-none">expand_more</mat-icon>
                      </div>
                    </td>
                    <td class="px-6 py-4 text-center">
                      <div class="flex items-center justify-center gap-2">
                        <button (click)="viewOrderDetails(order)" class="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 transition-colors" title="View Details">
                          <mat-icon>visibility</mat-icon>
                        </button>
                        <a [routerLink]="['/invoice']" [queryParams]="{orderId: order.order_number || order.id}" class="p-2 rounded-lg hover:bg-[#FFC107]/10 text-slate-400 hover:text-[#FFC107] transition-colors" title="Generate Invoice">
                          <mat-icon>receipt_long</mat-icon>
                        </a>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="8" class="px-6 py-12 text-center text-slate-400">
                      <mat-icon class="scale-[2] mb-4 opacity-20">search_off</mat-icon>
                      <p>No orders found matching your criteria</p>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          
          <!-- Pagination -->
          <div class="p-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
            <p class="text-xs text-slate-500">Showing {{ filteredOrders().length }} orders</p>
            <div class="flex gap-2">
              <button class="px-4 py-2 rounded-xl bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-400 font-bold text-xs hover:bg-slate-50 transition-colors">Previous</button>
              <button class="w-10 h-10 rounded-xl bg-[#FFC107] text-black font-bold text-xs shadow-lg shadow-[#FFC107]/20">1</button>
              <button class="px-4 py-2 rounded-xl bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-400 font-bold text-xs hover:bg-slate-50 transition-colors">Next</button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrdersList {
  search = inject(SearchService);
  toast = inject(ToastService);
  orderService = inject(OrderService);
  statusFilter = signal<string>('all');

  filteredOrders = computed(() => {
    const term = this.search.searchTerm().toLowerCase();
    const status = this.statusFilter();
    
    return this.orderService.orders().filter(o => {
      const matchesSearch = (o.order_number?.toLowerCase().includes(term) || false) || 
                           o.customer_name.toLowerCase().includes(term) || 
                           (o.hotel_name?.toLowerCase().includes(term) || false);
      const matchesStatus = status === 'all' || o.status === status;
      return matchesSearch && matchesStatus;
    });
  });

  getStatusClass(status: string): string {
    switch (status) {
      case 'delivered': return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400';
      case 'in-progress': return 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400';
      case 'placed': return 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400';
      case 'cancelled': return 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400';
      default: return 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400';
    }
  }

  updateStatus(order: Order, newStatus: string) {
    if (order.id) {
      this.orderService.updateStatus(order.id, newStatus);
    }
  }

  exportOrders() {
    this.toast.success('Orders exported successfully');
  }

  viewOrderDetails(order: Order) {
    this.toast.info(`Viewing details for order ${order.order_number}`);
  }
}
