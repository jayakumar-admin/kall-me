import { Component, inject, computed, signal, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { CatalogService, HotelMenuItem } from '../../services/catalog.service';
import { OrderService } from '../../services/order.service';
import { MenuItem } from '../../models';

@Component({
  selector: 'app-hotel-details',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterLink, FormsModule],
  template: `
    <div class="p-6 space-y-6">
      @if (hotel()) {
        <div class="flex items-center justify-between">
          <h1 class="text-3xl font-black text-[#1A1A1A] dark:text-white uppercase">{{ hotel()?.name }}</h1>
          <div class="flex items-center gap-4">
            <input type="date" [ngModel]="filterDate()" (ngModelChange)="filterDate.set($event)" class="p-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1E293B]">
            <a [routerLink]="['/app/hotels', hotel()?.id, 'edit']" class="bg-[#FFC107] text-black px-4 py-2 rounded-lg font-bold">Edit Details</a>
          </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="bg-white dark:bg-[#1E293B] p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-white/5">
            <h3 class="text-slate-500 font-bold uppercase text-xs">Total Orders</h3>
            <p class="text-3xl font-black text-[#1A1A1A] dark:text-white mt-2">{{ hotelOrders().length }}</p>
          </div>
          <div class="bg-white dark:bg-[#1E293B] p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-white/5">
            <h3 class="text-slate-500 font-bold uppercase text-xs">Total Revenue</h3>
            <p class="text-3xl font-black text-[#1A1A1A] dark:text-white mt-2">₹{{ totalRevenue() }}</p>
          </div>
          <div class="bg-white dark:bg-[#1E293B] p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-white/5">
            <h3 class="text-slate-500 font-bold uppercase text-xs">Menu Items</h3>
            <p class="text-3xl font-black text-[#1A1A1A] dark:text-white mt-2">{{ menuItems().length }}</p>
          </div>
        </div>

        <div class="bg-white dark:bg-[#1E293B] p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-white/5">
          <h2 class="text-xl font-bold mb-4">Menu</h2>
          <div class="space-y-2">
            @for (item of menuItems(); track item.id) {
              <div class="flex items-center justify-between p-3 bg-slate-50 dark:bg-[#0F172A] rounded-lg">
                <span>{{ item.name }}</span>
                <div class="flex items-center gap-2">
                  <input type="number" [(ngModel)]="editingPrices[item.id]" class="w-20 p-1 rounded border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1E293B] text-right">
                  <button (click)="updatePrice(item)" class="bg-indigo-600 text-white px-2 py-1 rounded text-xs">Save</button>
                </div>
              </div>
            }
          </div>
        </div>
      } @else {
        <p>Loading hotel details...</p>
      }
    </div>
  `
})
export class HotelDetails implements OnInit {
  private route = inject(ActivatedRoute);
  private catalog = inject(CatalogService);
  private orderService = inject(OrderService);
  
  hotelId = signal<number>(0);
  
  hotel = computed(() => this.catalog.hotels().find(m => m.id === this.hotelId()));
  
  menuItems = computed(() => this.catalog.hotelMenus()[this.hotelId()] || []);
  
  filterDate = signal<string>('');

  hotelOrders = computed(() => {
    const orders = this.orderService.orders().filter(o => o.hotel_id === this.hotelId());
    if (!this.filterDate()) return orders;
    return orders.filter(o => o.created_at?.startsWith(this.filterDate()));
  });
  
  totalRevenue = computed(() => this.hotelOrders().reduce((acc, o) => acc + (Number(o.grand_total) || 0), 0));

  editingPrices: Record<number, number> = {};

  ngOnInit() {
    this.orderService.loadOrders();
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      if (id) {
        this.hotelId.set(id);
        this.catalog.loadHotelMenu(id);
      }
    });
  }

  constructor() {
    effect(() => {
      this.menuItems().forEach(item => {
        if (this.editingPrices[item.id] === undefined) {
          this.editingPrices[item.id] = (item as HotelMenuItem).hotelPrice ?? item.price;
        }
      });
    });
  }
  
  updatePrice(item: MenuItem) {
    const newPrice = this.editingPrices[item.id];
    if (newPrice !== ((item as HotelMenuItem).hotelPrice ?? item.price)) {
      const currentItems = this.menuItems().map(i => 
        i.id === item.id ? { ...i, hotelPrice: newPrice } : i
      );
      this.catalog.saveHotelMenu(this.hotelId(), currentItems).subscribe({
        next: () => {
          // Update local state if needed, though saveHotelMenu already does it
          console.log('Price updated successfully');
        },
        error: () => console.error('Failed to update price')
      });
    }
  }
}
