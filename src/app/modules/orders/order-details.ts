import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api.service';
import { OrderService } from '../../services/order.service';
import { ToastService } from '../../services/toast.service';
import { SettingsService } from '../../services/settings.service';
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
              @if (order()!.status !== 'Delivered' && order()!.status !== 'Cancelled') {
                <button (click)="cancelOrder()" class="px-4 py-2 rounded-xl bg-red-50 text-red-600 font-bold text-sm hover:bg-red-100 transition-colors">
                  Cancel Order
                </button>
              }
              @if (order()!.status !== 'Cancelled') {
                <a [routerLink]="['/app/invoice']" [queryParams]="{orderId: order()!.order_number || order()!.id}" class="px-4 py-2 rounded-xl bg-[#FFC107] text-black font-bold text-sm hover:bg-[#FFA000] transition-colors flex items-center gap-2">
                  <mat-icon class="text-sm">receipt_long</mat-icon> Generate Invoice
                </a>
              }
            </div>
          </div>

          <div class="card space-y-6">
            <div class="flex justify-between items-start">
              <div>
                <h1 class="text-2xl font-black text-[#1A1A1A] dark:text-white">Order #{{ order()!.order_number }}</h1>
                <p class="text-slate-500">{{ order()!.created_at | date:'medium' }}</p>
              </div>
              <div class="relative">
                <select
                  [ngModel]="order()!.status"
                  (ngModelChange)="updateStatus($event)"
                  [class]="getStatusClass(order()!.status || 'Order Placed')"
                  class="appearance-none px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider outline-none cursor-pointer pr-8"
                  [disabled]="order()!.status === 'Cancelled' || order()!.status === 'Delivered'"
                >
                  @if (order()!.status === 'Order Placed') {
                    <option value="Order Placed">Order Placed</option>
                  }
                  <option value="Live">Live</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Delivered">Delivered</option>
                  @if (order()!.status === 'Cancelled') {
                    <option value="Cancelled">Cancelled</option>
                  }
                </select>
                <mat-icon class="absolute right-2 top-1/2 -translate-y-1/2 text-sm opacity-50 pointer-events-none">expand_more</mat-icon>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-6">
              <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Customer</p>
                <p class="font-bold text-[#1A1A1A] dark:text-white">{{ order()!.customer_phone }}</p>
                <p class="text-sm text-slate-500">{{ order()!.delivery_address }}</p>
              </div>
              <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Hotel</p>
                <p class="font-bold text-[#1A1A1A] dark:text-white">{{ (order()!.hotel_id === -1 || order()!.hotel_id === null) ? 'Manual Order' : order()!.hotel_name }}</p>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4 mb-2">Delivery Person</p>
                <p class="font-bold text-[#1A1A1A] dark:text-white">{{ order()!.delivery_person_name || 'Not Assigned' }}</p>
              </div>
            </div>

            @if (order()!.delivery_description) {
              <div class="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Manual Order Description</p>
                <p class="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{{ order()!.delivery_description }}</p>
              </div>
            }

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
                <div class="flex items-center gap-2">
                  <span class="text-[#1A1A1A] dark:text-white">₹</span>
                  <input type="number" [(ngModel)]="shippingFeeAmount" class="w-24 bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-200 dark:border-white/5 rounded-lg px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-[#FFC107] dark:text-white">
                  <button (click)="updateShippingFee()" class="text-[#FFC107] hover:text-[#FFA000]">
                    <mat-icon>save</mat-icon>
                  </button>
                </div>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-slate-500">GST ({{ gstPercent }}%)</span>
                <span class="text-[#1A1A1A] dark:text-white">₹{{ calculatedGst.toLocaleString() }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-slate-500">IGST ({{ igstPercent }}%)</span>
                <span class="text-[#1A1A1A] dark:text-white">₹{{ calculatedIgst.toLocaleString() }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-slate-500">Admin Commission</span>
                <span class="text-[#1A1A1A] dark:text-white">₹{{ (1 * (order()!.admin_commission_amount || 0)).toLocaleString() }} ({{ order()!.commission_percentage_applied || 0 }}%)</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-slate-500">Advance Amount</span>
                <div class="flex items-center gap-2">
                  <span class="text-[#1A1A1A] dark:text-white">₹</span>
                  <input type="number" [(ngModel)]="advanceAmount" class="w-24 bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-200 dark:border-white/5 rounded-lg px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-[#FFC107] dark:text-white">
                  <button (click)="updateAdvance()" class="text-[#FFC107] hover:text-[#FFA000]">
                    <mat-icon>save</mat-icon>
                  </button>
                </div>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-slate-500">Balance Pending</span>
                <div class="flex items-center gap-2">
                  <span class="text-[#1A1A1A] dark:text-white">₹</span>
                  <input type="number" [(ngModel)]="pendingAmount" class="w-24 bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-200 dark:border-white/5 rounded-lg px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-[#FFC107] dark:text-white">
                  <button (click)="updatePending()" class="text-[#FFC107] hover:text-[#FFA000]">
                    <mat-icon>save</mat-icon>
                  </button>
                </div>
              </div>
              <div class="flex justify-between text-lg font-black pt-2 border-t border-slate-100 dark:border-white/5">
                <span class="text-[#1A1A1A] dark:text-white">Grand Total</span>
                <div class="flex items-center gap-2">
                  <span class="text-[#FFC107]">₹{{ (1 * (grandTotalAmount || 0)).toLocaleString() }}</span>
                  <input type="number" [(ngModel)]="grandTotalAmount" class="w-24 bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-200 dark:border-white/5 rounded-lg px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-[#FFC107] dark:text-white ml-4">
                  <button (click)="updateGrandTotal()" class="text-[#FFC107] hover:text-[#FFA000]">
                    <mat-icon>save</mat-icon>
                  </button>
                </div>
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
  settingsService = inject(SettingsService);
  toast = inject(ToastService);
  order = signal<Order | null>(null);
  pendingAmount = 0;
  grandTotalAmount = 0;
  shippingFeeAmount = 0;
  advanceAmount = 0;

  get gstPercent() { return this.settingsService.settings().taxes.gst; }
  get igstPercent() { return this.settingsService.settings().taxes.igst; }

  get calculatedGst() {
    const sub = this.order()?.subtotal || 0;
    return (sub * this.gstPercent) / 100;
  }

  get calculatedIgst() {
    const sub = this.order()?.subtotal || 0;
    return (sub * this.igstPercent) / 100;
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.api.getOrder(id).subscribe({
          next: (order: Order) => {
            this.order.set(order);
            this.pendingAmount = order.balance_pending || 0;
            this.grandTotalAmount = order.grand_total || 0;
            this.shippingFeeAmount = order.shipping_fee || 0;
            this.advanceAmount = order.amount_received || 0;
          },
          error: (err: unknown) => {
            console.error('Failed to fetch order:', err);
            const foundOrder = this.orderService.orders().find(o => o.id?.toString() === id || o.order_number === id);
            if (foundOrder) {
              this.order.set(foundOrder);
              this.pendingAmount = foundOrder.balance_pending || 0;
              this.grandTotalAmount = foundOrder.grand_total || 0;
              this.shippingFeeAmount = foundOrder.shipping_fee || 0;
              this.advanceAmount = foundOrder.amount_received || 0;
            } else {
              this.toast.error('Order not found');
              this.router.navigate(['/app/orders']);
            }
          }
        });
      }
    });
  }

  updateAdvance() {
    const order = this.order();
    if (order && order.id) {
      const grandTotal = order.grand_total || 0;
      const newPending = Math.max(0, grandTotal - this.advanceAmount);
      this.pendingAmount = newPending;
      this.orderService.updateOrder(order.id, { amount_received: this.advanceAmount, balance_pending: newPending });
      this.order.update(o => o ? { ...o, amount_received: this.advanceAmount, balance_pending: newPending } : o);
      this.toast.success('Advance amount updated');
    }
  }

  updatePending() {
    const order = this.order();
    if (order && order.id) {
      const grandTotal = order.grand_total || 0;
      const amountReceived = Math.max(0, grandTotal - this.pendingAmount);
      this.advanceAmount = amountReceived;
      this.orderService.updateOrder(order.id, { balance_pending: this.pendingAmount, amount_received: amountReceived });
      this.order.update(o => o ? { ...o, balance_pending: this.pendingAmount, amount_received: amountReceived } : o);
      this.toast.success('Balance pending updated');
    }
  }

  updateGrandTotal() {
    const order = this.order();
    if (order && order.id) {
      const amountReceived = order.amount_received || 0;
      const newPending = Math.max(0, this.grandTotalAmount - amountReceived);
      this.pendingAmount = newPending;
      this.orderService.updateOrder(order.id, { grand_total: this.grandTotalAmount, balance_pending: newPending });
      this.order.update(o => o ? { ...o, grand_total: this.grandTotalAmount, balance_pending: newPending } : o);
      this.toast.success('Grand total updated');
    }
  }

  updateShippingFee() {
    const order = this.order();
    if (order && order.id) {
      const subtotal = order.subtotal || 0;
      const gst = (subtotal * this.gstPercent) / 100;
      const igst = (subtotal * this.igstPercent) / 100;
      const newGrandTotal = (1 * subtotal) + (1 * this.shippingFeeAmount) + gst + igst;
      this.grandTotalAmount = newGrandTotal;
      const amountReceived = order.amount_received || 0;
      const newPending = Math.max(0, newGrandTotal - amountReceived);
      this.pendingAmount = newPending;
      this.orderService.updateOrder(order.id, { shipping_fee: this.shippingFeeAmount, grand_total: newGrandTotal, balance_pending: newPending });
      this.order.update(o => o ? { ...o, shipping_fee: this.shippingFeeAmount, grand_total: newGrandTotal, balance_pending: newPending } : o);
      this.toast.success('Shipping fee updated');
    }
  }

  updateStatus(newStatus: string) {
    const order = this.order();
    if (order && order.id) {
      this.orderService.updateStatus(order.id, newStatus);
      this.order.update(o => o ? { ...o, status: newStatus as Order['status'] } : o);
      this.toast.success(`Order status updated to ${newStatus}`);
    }
  }

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

  cancelOrder() {
    const order = this.order();
    if (order && order.id) {
      this.orderService.updateStatus(order.id, 'Cancelled');
      this.toast.success('Order cancelled successfully');
      this.router.navigate(['/app/orders']);
    }
  }
}
