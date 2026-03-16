import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { LoaderService } from '../../../services/loader.service';
import { Order } from '../../../models';

@Component({
  selector: 'app-delivery-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterLink],
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeliveryDashboard implements OnInit {
  private api = inject(ApiService);
  private loader = inject(LoaderService);

  stats = signal({
    total: 0,
    pending: 0,
    completed: 0,
    earnings: 0
  });

  recentOrders = signal<Order[]>([]);

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.loader.show('Loading dashboard...');
    this.api.getDeliveryOrders().subscribe({
      next: (orders: Order[]) => {
        const total = orders.length;
        const pending = orders.filter(o => o.status !== 'delivered').length;
        const completed = orders.filter(o => o.status === 'delivered').length;
        const earnings = orders
          .filter(o => o.status === 'delivered')
          .reduce((acc, curr) => acc + (curr.grand_total || 0), 0);

        this.stats.set({ total, pending, completed, earnings });
        this.recentOrders.set(orders.slice(0, 5));
        this.loader.hide();
      },
      error: () => {
        this.loader.hide();
      }
    });
  }
}
