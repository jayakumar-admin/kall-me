import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SearchService } from '../../services/search.service';
import { ToastService } from '../../services/toast.service';
import { OrderService } from '../../services/order.service';
import { Order } from '../../models';

import { MainSkeletonComponent } from '../../components/main-skeleton';

@Component({
  selector: 'app-orders-list',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, RouterLink, MainSkeletonComponent],
  templateUrl: './orders-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrdersList implements OnInit {
  search = inject(SearchService);
  toast = inject(ToastService);
  orderService = inject(OrderService);
  router = inject(Router);
  statusFilter = signal<string>('all');
  searchTerm = signal('');
  
  pageSize = signal<number>(10);
  currentPage = signal<number>(1);

  ngOnInit() {
    this.orderService.loadOrders();
  }

  effectiveSearchTerm = computed(() => (this.searchTerm() || this.search.searchTerm() || '').toLowerCase().trim());

  filteredOrders = computed(() => {
    const term = this.effectiveSearchTerm();
    const status = this.statusFilter();
    
    return this.orderService.orders().filter(o => {
      const matchesSearch = !term ||
                           (o.order_number?.toLowerCase().includes(term) || false) || 
                           (o.customer_phone?.toLowerCase().includes(term) || false) || 
                           (o.customer_name?.toLowerCase().includes(term) || false) ||
                           (o.hotel_name?.toLowerCase().includes(term) || false) ||
                           (o.delivery_person_name?.toLowerCase().includes(term) || false) ||
                           (o.delivery_address?.toLowerCase().includes(term) || false);
      const matchesStatus = status === 'all' || o.status === status;
      return matchesSearch && matchesStatus;
    });
  });

  onSearchChange(term: string) {
    this.searchTerm.set(term);
    this.search.setSearchTerm(term);
    this.currentPage.set(1);
  }

  clearSearch() {
    this.searchTerm.set('');
    this.search.clearSearch();
    this.currentPage.set(1);
  }

  totalPages = computed(() => {
    return Math.ceil(this.filteredOrders().length / this.pageSize()) || 1;
  });

  currentPageClamped = computed(() => {
    const page = this.currentPage();
    const total = this.totalPages();
    if (page < 1) return 1;
    if (page > total) return total;
    return page;
  });

  paginatedOrders = computed(() => {
    const all = this.filteredOrders();
    const size = this.pageSize();
    const page = this.currentPageClamped();
    const start = (page - 1) * size;
    return all.slice(start, start + size);
  });

  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPageClamped();
    const pages: number[] = [];
    
    let start = Math.max(1, current - 2);
    const end = Math.min(total, start + 4);
    
    if (end - start < 4) {
      start = Math.max(1, end - 4);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  });

  paginationMessage = computed(() => {
    const total = this.filteredOrders().length;
    if (total === 0) return 'Showing 0 to 0 of 0 orders';
    const size = this.pageSize();
    const page = this.currentPageClamped();
    const start = (page - 1) * size + 1;
    const end = Math.min(page * size, total);
    return `Showing ${start} to ${end} of ${total} orders`;
  });

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  nextPage() {
    this.setPage(this.currentPageClamped() + 1);
  }

  prevPage() {
    this.setPage(this.currentPageClamped() - 1);
  }

  setPageSize(size: string | number) {
    this.pageSize.set(Number(size));
    this.currentPage.set(1);
  }

  stats = computed(() => {
    const allOrders = this.filteredOrders();
    const getNumber = (value: number | string | undefined) => Math.round(Number(value) || 0);

    const isCancelledFilter = this.statusFilter() === 'Cancelled';
    const validOrders = isCancelledFilter ? [] : allOrders.filter(o => o.status !== 'Cancelled');
    const cancelledOrders = isCancelledFilter ? allOrders : allOrders.filter(o => o.status === 'Cancelled');

    return {
      total: isCancelledFilter ? allOrders.length : validOrders.length,
      allTotal: allOrders.length,
      cancelledTotal: cancelledOrders.length,
      revenue: validOrders.reduce((acc, o) => acc + getNumber(o.grand_total), 0),
      lostRevenue: cancelledOrders.reduce((acc, o) => acc + getNumber(o.grand_total), 0),
      received: validOrders.reduce((acc, o) => acc + getNumber(o.amount_received), 0),
      pending: validOrders.reduce((acc, o) => acc + getNumber(o.balance_pending), 0)
    };
  });

  getStatusClass(status: string): string {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'delivered': return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400';
      case 'in transit':
      case 'in-transit': return 'bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400';
      case 'live': return 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400';
      case 'order placed': return 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400';
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
    const orders = this.filteredOrders();
    if (orders.length === 0) {
      this.toast.error('No orders to export');
      return;
    }
    const headers = ['Order Number', 'Date', 'Hotel', 'Customer Name', 'Phone', 'Address', 'Status', 'Bill Total', 'Advance Paid', 'Pending Balance'];
    const rows = orders.map(o => [
      `"${o.order_number || ''}"`,
      `"${o.created_at ? new Date(o.created_at).toLocaleString('en-IN') : ''}"`,
      `"${(o.hotel_id === -1 || o.hotel_id === null) ? 'Manual Order' : (o.hotel_name || '')}"`,
      `"${o.customer_name || ''}"`,
      `"${o.customer_phone || ''}"`,
      `"${(o.delivery_address || '').replace(/"/g, '""')}"`,
      `"${o.status || ''}"`,
      o.status === 'Cancelled' ? `0 (Lost: ${o.grand_total || 0})` : (o.grand_total || 0),
      o.amount_received || 0,
      o.status === 'Cancelled' ? 0 : (o.balance_pending || 0)
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `orders_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.toast.success('Orders exported successfully');
  }

  viewOrderDetails(order: Order) {
    this.router.navigate(['/app/orders', order.id || order.order_number]);
  }
}
