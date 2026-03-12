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
  template: `
    @if (catalog.loading()) {
      <app-main-skeleton />
    } @else {
      <div class="h-full overflow-y-auto p-6 custom-scrollbar space-y-8">
        <!-- Welcome Header -->
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-display font-black text-[#1A1A1A] dark:text-white mb-1">Overview</h1>
            <p class="text-slate-500 dark:text-slate-400">Welcome back, Admin. Here's what's happening today.</p>
          </div>
          <div class="flex items-center gap-3">
            <div class="bg-white dark:bg-[#1E293B] px-4 py-2 rounded-xl border border-slate-100 dark:border-white/5 shadow-sm flex items-center gap-2">
              <mat-icon class="text-[#FFC107]">calendar_today</mat-icon>
              <span class="text-sm font-bold text-[#1A1A1A] dark:text-white">{{ today | date:'MMMM dd, yyyy' }}</span>
            </div>
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="card flex items-center gap-6 group hover:border-[#FFC107]/30 transition-all">
            <div class="w-14 h-14 rounded-2xl bg-[#FFC107]/10 flex items-center justify-center text-[#FFC107] group-hover:scale-110 transition-transform">
              <mat-icon class="scale-125">assignment</mat-icon>
            </div>
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Orders</p>
              <p class="text-3xl font-black text-[#1A1A1A] dark:text-white">{{ orderService.stats().total }}</p>
              <div class="mt-2 w-32 h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                <div class="h-full bg-[#FFC107]" [style.width.%]="65"></div>
              </div>
            </div>
          </div>

          <div class="card flex items-center gap-6 group hover:border-[#FFC107]/30 transition-all">
            <div class="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
              <mat-icon class="scale-125">payments</mat-icon>
            </div>
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Revenue</p>
              <p class="text-3xl font-black text-[#1A1A1A] dark:text-white">₹{{ orderService.stats().revenue | number:'1.2-2' }}</p>
              <div class="mt-2 w-32 h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                <div class="h-full bg-emerald-500" [style.width.%]="45"></div>
              </div>
            </div>
          </div>

          <div class="card flex items-center gap-6 group hover:border-[#FFC107]/30 transition-all">
            <div class="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
              <mat-icon class="scale-125">pedal_bike</mat-icon>
            </div>
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Drivers</p>
              <p class="text-3xl font-black text-[#1A1A1A] dark:text-white">{{ activeDrivers() }}</p>
              <div class="mt-2 w-32 h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                <div class="h-full bg-blue-500" [style.width.%]="80"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Merchants -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-xl font-bold text-[#1A1A1A] dark:text-white">Partner Merchants</h3>
            <button routerLink="/hotels" class="text-sm font-bold text-[#FFC107] hover:underline">View All</button>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (merchant of filteredMerchants(); track merchant.id) {
              <div class="card !p-0 overflow-hidden group hover:shadow-xl transition-all border-none ring-1 ring-slate-100 dark:ring-white/5">
                <div class="h-32 overflow-hidden relative">
                  <img [src]="merchant.image_url" [alt]="merchant.name" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerpolicy="no-referrer">
                  <div class="absolute top-3 right-3 bg-white/90 dark:bg-black/80 backdrop-blur px-2 py-1 rounded-lg flex items-center gap-1">
                    <mat-icon class="text-xs text-[#FFC107]">star</mat-icon>
                    <span class="text-xs font-bold text-[#1A1A1A] dark:text-white">{{ merchant.rating }}</span>
                  </div>
                </div>
                <div class="p-4">
                  <h4 class="font-bold text-[#1A1A1A] dark:text-white">{{ merchant.name }}</h4>
                  <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">{{ merchant.category }} • {{ merchant.reviews }} Reviews</p>
                  <div class="mt-4 flex items-center justify-between">
                    <button [routerLink]="['/create-order']" [queryParams]="{merchantId: merchant.id}" class="text-xs font-bold bg-[#FFC107] text-black px-3 py-1.5 rounded-lg">Create Order</button>
                    <mat-icon class="text-slate-300 dark:text-white/10">arrow_forward</mat-icon>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Dashboard implements OnInit {
  search = inject(SearchService);
  catalog = inject(CatalogService);
  orderService = inject(OrderService);
  api = inject(ApiService);

  today = new Date();
  activeDrivers = signal(0);

  filteredMerchants = computed(() => {
    const term = this.search.searchTerm().toLowerCase();
    return this.catalog.merchants().filter(m => 
      m.name.toLowerCase().includes(term) || 
      m.category.toLowerCase().includes(term)
    ).slice(0, 6); // Show only top 6 on dashboard
  });

  ngOnInit() {
    this.api.getDeliveryTeam().subscribe(team => {
      this.activeDrivers.set(team.length);
    });
  }
}
