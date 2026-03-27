import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { Order } from '../../models';

@Component({
  selector: 'app-bulk-invoice-generation',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="p-8 max-w-7xl mx-auto space-y-8">
      <h1 class="text-3xl font-display font-black text-[#1A1A1A] dark:text-white uppercase tracking-tight">Bulk Invoice Generation</h1>
      
      <div class="card p-6">
        <div class="flex gap-4 mb-6">
          <input 
            type="text" 
            [(ngModel)]="searchOrderId"
            (keydown.enter)="addOrder()"
            placeholder="Enter Order ID" 
            class="flex-1 bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#FFC107]/50 dark:text-white"
          >
          <button (click)="addOrder()" class="btn-primary">Add to List</button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-slate-200 dark:border-white/10">
                <th class="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Order ID</th>
                <th class="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Phone</th>
                <th class="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Total</th>
                <th class="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              @for (order of selectedOrders(); track order.id) {
                <tr class="border-b border-slate-100 dark:border-white/5">
                  <td class="py-4 text-[#1A1A1A] dark:text-white">{{ order.order_number }}</td>
                  <td class="py-4 text-slate-500">{{ order.customer_phone }}</td>
                  <td class="py-4 text-slate-500">{{ order.grand_total | currency:'INR' }}</td>
                  <td class="py-4">
                    <button (click)="removeOrder(order.id!)" class="text-red-500 hover:text-red-700">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="mt-6 flex justify-end">
          <button (click)="generateBulkInvoices()" class="btn-primary" [disabled]="selectedOrders().length === 0">
            Generate Invoices
          </button>
        </div>
      </div>
    </div>
  `
})
export class BulkInvoiceGeneration {
  api = inject(ApiService);
  toast = inject(ToastService);
  searchOrderId = '';
  selectedOrders = signal<Order[]>([]);

  addOrder() {
    if (!this.searchOrderId.trim()) return;
    this.api.getOrder(this.searchOrderId.trim()).subscribe({
      next: (order) => {
        if (!this.selectedOrders().find(o => o.id === order.id)) {
          this.selectedOrders.update(orders => [...orders, order]);
          this.searchOrderId = '';
        } else {
          this.toast.error('Order already added');
        }
      },
      error: () => this.toast.error('Order not found')
    });
  }

  removeOrder(id: number) {
    this.selectedOrders.update(orders => orders.filter(o => o.id !== id));
  }

  generateBulkInvoices() {
    this.toast.info('Generating bulk invoices...');
    // Implementation for bulk generation would go here
  }
}
