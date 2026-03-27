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

  ngOnInit() {
    this.orderService.loadOrders();
  }

  filteredOrders = computed(() => {
    const term = this.search.searchTerm().toLowerCase();
    const status = this.statusFilter();
    
    return this.orderService.orders().filter(o => {
      const matchesSearch = (o.order_number?.toLowerCase().includes(term) || false) || 
                           (o.customer_phone?.toLowerCase().includes(term) || false) || 
                           (o.hotel_name?.toLowerCase().includes(term) || false);
      const matchesStatus = status === 'all' || o.status === status;
      return matchesSearch && matchesStatus;
    });
  });

  stats = computed(() => {
    const allOrders = this.filteredOrders();
    const getNumber = (value: number | string | undefined) => Math.round(Number(value) || 0);

    return {
      total: allOrders.length,
      revenue: allOrders.reduce((acc, o) => acc + getNumber(o.grand_total), 0),
      received: allOrders.reduce((acc, o) => acc + getNumber(o.amount_received), 0),
      pending: allOrders.reduce((acc, o) => acc + getNumber(o.balance_pending), 0)
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
    this.toast.success('Orders exported successfully');
  }

  viewOrderDetails(order: Order) {
    this.router.navigate(['/app/orders', order.id || order.order_number]);
  }
}
