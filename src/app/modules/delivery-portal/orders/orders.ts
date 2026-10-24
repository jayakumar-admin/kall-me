import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
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
  searchTerm = signal<string>('');
  
  statusOptions = ['Live', 'In Transit', 'Delivered'];

  filteredOrders = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const list = this.orders();
    if (!term) return list;
    return list.filter(o => 
      (o.order_number && o.order_number.toLowerCase().includes(term)) ||
      (o.customer_phone && o.customer_phone.toLowerCase().includes(term)) ||
      (o.hotel_name && o.hotel_name.toLowerCase().includes(term)) ||
      (o.delivery_address && o.delivery_address.toLowerCase().includes(term)) ||
      (o.delivery_description && o.delivery_description.toLowerCase().includes(term)) ||
      (o.items && o.items.some(i => i.menu_name && i.menu_name.toLowerCase().includes(term)))
    );
  });

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
