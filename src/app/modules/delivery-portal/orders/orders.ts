import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { LoaderService } from '../../../services/loader.service';
import { ToastService } from '../../../services/toast.service';
import { Order } from '../../../models';

@Component({
  selector: 'app-delivery-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './orders.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeliveryOrders implements OnInit {
  private api = inject(ApiService);
  private loader = inject(LoaderService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);

  orders = signal<Order[]>([]);
  selectedOrder = signal<Order | null>(null);
  
  statusOptions = ['placed', 'preparing', 'accepted', 'picked-up', 'in-transit', 'delivered'];

  ngOnInit() {
    this.loadOrders();
    this.route.queryParams.subscribe(params => {
      const orderId = params['id'];
      if (orderId) {
        const order = this.orders().find(o => o.id === +orderId);
        if (order) {
          this.selectOrder(order);
        }
      }
    });
  }

  loadOrders() {
    this.loader.show('Fetching assigned orders...');
    this.api.getDeliveryOrders().subscribe({
      next: (orders: Order[]) => {
        this.orders.set(orders);
        this.loader.hide();
        
        // Handle direct order selection if needed
        const orderId = this.route.snapshot.queryParams['id'];
        if (orderId) {
          const order = orders.find(o => o.id === +orderId);
          if (order) {
            this.selectOrder(order);
          }
        }
      },
      error: () => {
        this.loader.hide();
        this.toast.show('Failed to load orders', 'error');
      }
    });
  }

  selectOrder(order: Order) {
    this.selectedOrder.set(order);
  }

  updateStatus(status: string) {
    const order = this.selectedOrder();
    if (!order || !order.id) return;

    this.loader.show('Updating status...');
    this.api.updateDeliveryStatus(order.id, status).subscribe({
      next: () => {
        this.toast.show(`Order status updated to ${status}`, 'success');
        this.loadOrders();
        this.selectedOrder.set(null);
        this.loader.hide();
      },
      error: () => {
        this.loader.hide();
        this.toast.show('Failed to update status', 'error');
      }
    });
  }

  callCustomer(phone: string) {
    window.location.href = `tel:${phone}`;
  }

  openMap(address: string) {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
  }
}
