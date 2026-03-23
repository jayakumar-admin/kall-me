import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { SearchService } from '../../services/search.service';
import { CatalogService } from '../../services/catalog.service';
import { OrderService } from '../../services/order.service';
import { ApiService } from '../../services/api.service';

import { MainSkeletonComponent } from '../../components/main-skeleton';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterLink, MainSkeletonComponent],
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Dashboard implements OnInit {
  search = inject(SearchService);
  catalog = inject(CatalogService);
  orderService = inject(OrderService);
  api = inject(ApiService);

  today = new Date();
  activeDrivers = signal(0);

  filteredHotels = computed(() => {
    const term = (this.search.searchTerm() || '').toLowerCase();
    return this.catalog.hotels().filter(h => 
      (h.name || '').toLowerCase().includes(term) || 
      (h.category || '').toLowerCase().includes(term)
    ).slice(0, 6); // Show only top 6 on dashboard
  });

  ngOnInit() {
    this.orderService.loadOrders();
    this.api.getDeliveryTeam().subscribe(team => {
      this.activeDrivers.set(team.length);
    });
  }
}
