import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api.service';
import { OrderService } from '../../services/order.service';
import { ToastService } from '../../services/toast.service';
import { Order } from '../../models';

@Component({
  selector: 'app-order-details',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterLink, FormsModule],
  template: `
    <div class="h-full overflow-y-auto p-6 custom-scrollbar">
      @if (order()) {
        <div class="max-w-4xl mx-auto space-y-6">
          <div class="flex items-center justify-between">
            <button routerLink="/app/orders" class="flex items-center gap-2 text-slate-500 hover:text-[#1A1A1A] dark:hover:text-white transition-colors">
              <mat-icon>arrow_back</mat-icon> Back to Orders
            </button>
            <div class="flex gap-3">
              <button (click)="cancelOrder()" class="px-4 py-2 rounded-xl bg-red-50 text-red-600 font-bold text-sm hover:bg-red-100 transition-colors">
                Cancel Order
              </button>
              <a [routerLink]="['/app/invoice']" [queryParams]="{orderId: order()!.order_number || order()!.id}" class="px-4 py-2 rounded-xl bg-[#FFC107] text-black font-bold text-sm hover:bg-[#FFA000] transition-colors flex items-center gap-2">
                <mat-icon class="text-sm">receipt_long</mat-icon> Generate Invoice
              </a>
            </div>
          </div>

          <div class="card space-y-6">
            <div class="flex justify-between items-start">
              <div>
                <h1 class="text-2xl font-black text-[#1A1A1A] dark:text-white">Order #{{ order()!.order_number }}</h1>
                <p class="text-slate-500">{{ order()!.created_at | date:'medium' }}</p>
              </div>
              <span [class]="getStatusClass(order()!.status || 'placed')" class="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
                {{ order()!.status }}
              </span>
            </div>

            <div class="grid grid-cols-2 gap-6">
              <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Customer</p>
                <p class="font-bold text-[#1A1A1A] dark:text-white">{{ order()!.customer_name }}</p>
                <p class="text-sm text-slate-500">{{ order()!.customer_phone }}</p>
                <p class="text-sm text-slate-500">{{ order()!.delivery_address }}</p>
              </div>
              <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Hotel</p>
                <p class="font-bold text-[#1A1A1A] dark:text-white">{{ order()!.hotel_name }}</p>
              </div>
            </div>

            <div class="border-t border-slate-100 dark:border-white/5 pt-6">
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Items</p>
              <div class="space-y-3">
                @for (item of order()!.items; track item.menu_id) {
                  <div class="flex justify-between text-sm">
                    <span class="text-[#1A1A1A] dark:text-white">{{ item.menu_name }} x {{ item.quantity }}</span>
                    <span class="font-medium text-[#1A1A1A] dark:text-white">₹{{ (1 * (item.total || 0)).toLocaleString() }}</span>
                  </div>
                }
              </div>
            </div>

            <div class="border-t border-slate-100 dark:border-white/5 pt-6 space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-slate-500">Subtotal</span>
                <span class="text-[#1A1A1A] dark:text-white">₹{{ (1 * (order()!.subtotal || 0)).toLocaleString() }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-slate-500">Shipping</span>
                <span class="text-[#1A1A1A] dark:text-white">₹{{ (1 * (order()!.shipping_fee || 0)).toLocaleString() }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-slate-500">Balance Pending</span>
                <div class="flex items-center gap-2">
                  <input type="number" [(ngModel)]="pendingAmount" class="w-24 bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-200 dark:border-white/5 rounded-lg px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-[#FFC107] dark:text-white">
                  <button (click)="updatePending()" class="text-[#FFC107] hover:text-[#FFA000]">
                    <mat-icon>save</mat-icon>
                  </button>
                </div>
              </div>
              <div class="flex justify-between text-lg font-black pt-2 border-t border-slate-100 dark:border-white/5">
                <span class="text-[#1A1A1A] dark:text-white">Grand Total</span>
                <span class="text-[#FFC107]">₹{{ (1 * (order()!.grand_total || 0)).toLocaleString() }}</span>
              </div>
            </div>
          </div>
        </div>
      } @else {
        <div class="py-12 text-center text-slate-500">
          <mat-icon class="text-4xl mb-4 opacity-50">search_off</mat-icon>
          <p>Order not found.</p>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderDetails implements OnInit {
  route = inject(ActivatedRoute);
  router = inject(Router);
  api = inject(ApiService);
  orderService = inject(OrderService);
  toast = inject(ToastService);
  order = signal<Order | null>(null);
  pendingAmount = 0;

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.api.getOrder(id).subscribe({
          next: (order: Order) => {
            this.order.set(order);
            this.pendingAmount = order.balance_pending || 0;
          },
          error: (err: unknown) => {
            console.error('Failed to fetch order:', err);
            const foundOrder = this.orderService.orders().find(o => o.id?.toString() === id || o.order_number === id);
            if (foundOrder) {
              this.order.set(foundOrder);
              this.pendingAmount = foundOrder.balance_pending || 0;
            } else {
              this.toast.error('Order not found');
              this.router.navigate(['/app/orders']);
            }
          }
        });
      }
    });
  }

  updatePending() {
    const order = this.order();
    if (order && order.id) {
      const grandTotal = order.grand_total || 0;
      const amountReceived = grandTotal - this.pendingAmount;
      this.api.updateOrder(order.id, { balance_pending: this.pendingAmount, amount_received: amountReceived }).subscribe({
        next: (updatedOrder) => {
          this.order.set(updatedOrder);
          this.toast.success('Pending amount updated successfully');
        },
        error: (err) => {
          console.error('Failed to update pending amount:', err);
          this.toast.error('Failed to update pending amount');
        }
      });
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'delivered': return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400';
      case 'in-progress': return 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400';
      case 'placed': return 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400';
      case 'cancelled': return 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400';
      default: return 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400';
    }
  }

  cancelOrder() {
    const order = this.order();
    if (order && order.id) {
      this.orderService.updateStatus(order.id, 'cancelled');
      this.toast.success('Order cancelled successfully');
      this.router.navigate(['/app/orders']);
    }
  }
}
