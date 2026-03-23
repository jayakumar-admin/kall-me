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
              @if (isOrderActive()) {
                <button (click)="cancelOrder()" class="px-4 py-2 rounded-xl bg-red-50 text-red-600 font-bold text-sm hover:bg-red-100 transition-colors">
                  Cancel Order
                </button>
              }

              <a [routerLink]="['/app/invoice']"
                 [queryParams]="{orderId: order()!.order_number || order()!.id}"
                 class="px-4 py-2 rounded-xl bg-[#FFC107] text-black font-bold text-sm hover:bg-[#FFA000] transition-colors flex items-center gap-2">
                <mat-icon class="text-sm">receipt_long</mat-icon> Generate Invoice
              </a>
            </div>
          </div>

          <div class="card space-y-6">
            <div class="flex justify-between items-start">
              <div>
                <h1 class="text-2xl font-black text-[#1A1A1A] dark:text-white">
                  Order #{{ order()!.order_number }}
                </h1>
                <p class="text-slate-500">
                  {{ order()!.created_at | date:'medium' }}
                </p>
              </div>

              <span
                [class]="getStatusClass(order()!.status || 'Order Placed')"
                class="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
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
                    <span class="text-[#1A1A1A] dark:text-white">
                      {{ item.menu_name }} x {{ item.quantity }}
                    </span>
                    <span class="font-medium text-[#1A1A1A] dark:text-white">
                      ₹{{ (item.total || 0).toLocaleString() }}
                    </span>
                  </div>
                }
              </div>
            </div>

            <div class="border-t border-slate-100 dark:border-white/5 pt-6 space-y-2">

              <div class="flex justify-between text-sm">
                <span class="text-slate-500">Subtotal</span>
                <span class="text-[#1A1A1A] dark:text-white">
                  ₹{{ (order()!.subtotal || 0).toLocaleString() }}
                </span>
              </div>

              <div class="flex justify-between text-sm">
                <span class="text-slate-500">Shipping</span>
                <div class="flex items-center gap-2">
                  <span>₹</span>
                  <input type="number" [(ngModel)]="shippingFeeAmount" class="w-24 input"/>
                  <button (click)="updateShippingFee()">
                    <mat-icon>save</mat-icon>
                  </button>
                </div>
              </div>

              <div class="flex justify-between text-sm">
                <span class="text-slate-500">Balance Pending</span>
                <div class="flex items-center gap-2">
                  <input type="number" [(ngModel)]="pendingAmount" class="w-24 input"/>
                  <button (click)="updatePending()">
                    <mat-icon>save</mat-icon>
                  </button>
                </div>
              </div>

              <div class="flex justify-between text-lg font-black pt-2 border-t">
                <span>Grand Total</span>
                <div class="flex items-center gap-2">
                  <span>₹</span>
                  <input type="number" [(ngModel)]="grandTotalAmount" class="w-24 input"/>
                  <button (click)="updateGrandTotal()">
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
  toast = inject(ToastService);

  // ✅ FIXED
  order = signal<Order | null>(null);

  pendingAmount = 0;
  grandTotalAmount = 0;
  shippingFeeAmount = 0;

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
          },
          error: () => {
            const foundOrder = this.orderService.orders()
              .find(o => o.id?.toString() === id || o.order_number === id);

            if (foundOrder) {
              this.order.set(foundOrder);
            } else {
              this.toast.error('Order not found');
              this.router.navigate(['/app/orders']);
            }
          }
        });
      }
    });
  }

  // ✅ CLEAN STATUS CHECK
  isOrderActive(): boolean {
    const status = (this.order()?.status || '').toLowerCase();
    return status !== 'delivered' && status !== 'cancelled';
  }

  updatePending() {
    const order = this.order();
    if (!order?.id) return;

    const grandTotal = order.grand_total || 0;
    const amountReceived = grandTotal - this.pendingAmount;

    this.orderService.updateOrder(order.id, {
      balance_pending: this.pendingAmount,
      amount_received: amountReceived
    });
  }

  updateGrandTotal() {
    const order = this.order();
    if (!order?.id) return;

    const amountReceived = order.amount_received || 0;
    const newPending = Math.max(0, this.grandTotalAmount - amountReceived);

    this.pendingAmount = newPending;

    this.orderService.updateOrder(order.id, {
      grand_total: this.grandTotalAmount,
      balance_pending: newPending
    });
  }

  updateShippingFee() {
    const order = this.order();
    if (!order?.id) return;

    const subtotal = order.subtotal || 0;
    const newGrandTotal = subtotal + this.shippingFeeAmount;

    this.grandTotalAmount = newGrandTotal;

    const amountReceived = order.amount_received || 0;
    this.pendingAmount = Math.max(0, newGrandTotal - amountReceived);

    this.orderService.updateOrder(order.id, {
      shipping_fee: this.shippingFeeAmount,
      grand_total: newGrandTotal,
      balance_pending: this.pendingAmount
    });
  }

  getStatusClass(status: string): string {
    const s = status.toLowerCase();

    switch (s) {
      case 'delivered': return 'bg-emerald-100 text-emerald-600';
      case 'in transit':
      case 'in-transit': return 'bg-purple-100 text-purple-600';
      case 'live': return 'bg-blue-100 text-blue-600';
      case 'order placed': return 'bg-amber-100 text-amber-600';
      case 'cancelled': return 'bg-red-100 text-red-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  }

  cancelOrder() {
    const order = this.order();
    if (!order?.id) return;

    this.orderService.updateStatus(order.id, 'Cancelled');
    this.toast.success('Order cancelled successfully');
    this.router.navigate(['/app/orders']);
  }
}