import { Injectable, signal, computed, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Order } from '../models';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  orders = signal<Order[]>([]);
  loading = signal(true);
  
  stats = computed(() => {
    const allOrders = this.orders();
    const getNumber = (value: number | string | undefined) => Math.round(Number(value) || 0);

    const validOrders = allOrders.filter(o => o.status !== 'Cancelled');
    const cancelledOrders = allOrders.filter(o => o.status === 'Cancelled');

    return {
      total: validOrders.length,
      allTotal: allOrders.length,
      cancelledTotal: cancelledOrders.length,
      revenue: validOrders.reduce((acc, o) => acc + getNumber(o.grand_total), 0),
      lostRevenue: cancelledOrders.reduce((acc, o) => acc + getNumber(o.grand_total), 0),
      received: validOrders.reduce((acc, o) => acc + getNumber(o.amount_received), 0),
      pending: validOrders.reduce((acc, o) => acc + getNumber(o.balance_pending), 0)
    };
  });

  loadOrders() {
    this.loading.set(true);
    this.api.getOrders().subscribe({
      next: (orders) => {
        this.orders.set(orders);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load orders');
        this.loading.set(false);
      }
    });
  }

  updateStatus(id: number, status: string) {
    this.api.updateOrderStatus(id, status).subscribe({
      next: (updated) => {
        this.orders.update(current => current.map(o => o.id == id ? { ...o, ...updated } : o));
        this.toast.success(`Order #${updated.order_number} status updated to ${status}`);
      },
      error: () => this.toast.error('Failed to update order status')
    });
  }

  updateOrder(id: number, data: Partial<Order>) {
    return this.api.updateOrder(id, data).subscribe({
      next: (updated) => {
        this.orders.update(current => current.map(o => o.id == id ? { ...o, ...updated } : o));
        this.toast.success('Order updated successfully');
      },
      error: () => this.toast.error('Failed to update order')
    });
  }
}
