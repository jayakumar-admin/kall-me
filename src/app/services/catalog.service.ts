import { Injectable, signal, computed, inject } from '@angular/core';
import { MenuItem } from '../data/static-data';
import { ApiService } from './api.service';
import { Hotel } from '../models';
import { ToastService } from './toast.service';

export interface MerchantMenuItem extends MenuItem {
  merchantPrice?: number;
  isLinked?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CatalogService {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  // Global repository of all available menu items
  globalMenu = signal<MenuItem[]>([]);
  
  // List of merchants
  merchants = signal<Hotel[]>([]);
  loading = signal(true);

  // Map of merchant ID to their specific menu items
  merchantMenus = signal<Record<string, MerchantMenuItem[]>>({});

  constructor() {
    this.loadInitialData();
  }

  loadInitialData() {
    this.loading.set(true);
    this.api.getHotels().subscribe({
      next: (hotels) => {
        this.merchants.set(hotels);
        // Load menus for each hotel
        hotels.forEach(hotel => this.loadMerchantMenu(hotel.id));
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load hotels');
        this.loading.set(false);
      }
    });

    this.api.getMenus().subscribe({
      next: (items: MenuItem[]) => this.globalMenu.set(items),
      error: () => this.toast.error('Failed to load menu items')
    });
  }

  loadMerchantMenu(hotelId: number) {
    this.api.getMenus(hotelId).subscribe({
      next: (items) => {
        this.merchantMenus.update(current => ({
          ...current,
          [hotelId]: items.map(item => ({ ...item, merchantPrice: item.price, isLinked: true }))
        }));
      }
    });
  }

  // Add a new merchant
  addMerchant(merchant: Partial<Hotel>) {
    this.api.createHotel(merchant).subscribe({
      next: (newHotel) => {
        this.merchants.update(current => [...current, newHotel]);
        this.toast.success(`${newHotel.name} added successfully`);
      },
      error: () => this.toast.error('Failed to add restaurant')
    });
  }

  // Update merchant
  updateMerchant(id: number, merchant: Partial<Hotel>) {
    this.api.updateHotel(id, merchant).subscribe({
      next: (updated) => {
        this.merchants.update(current => current.map(m => m.id === id ? updated : m));
        this.toast.success(`${updated.name} updated successfully`);
      },
      error: () => this.toast.error('Failed to update restaurant')
    });
  }

  // Delete merchant
  deleteMerchant(id: number) {
    this.api.deleteHotel(id).subscribe({
      next: () => {
        this.merchants.update(current => current.filter(m => m.id !== id));
        this.toast.success('Restaurant removed successfully');
      },
      error: () => this.toast.error('Failed to remove restaurant')
    });
  }

  getMerchantMenu(merchantId: number) {
    return computed(() => this.merchantMenus()[merchantId] || []);
  }

  addMenuItem(item: Partial<MenuItem>) {
    this.api.createMenuItem(item).subscribe({
      next: (newItem) => {
        if (newItem.hotel_id) {
          this.loadMerchantMenu(newItem.hotel_id);
        }
        this.toast.success(`${newItem.name} added to menu`);
      },
      error: () => this.toast.error('Failed to add menu item')
    });
  }

  updateMenuItem(id: number, item: Partial<MenuItem>) {
    this.api.updateMenuItem(id, item).subscribe({
      next: (updated) => {
        if (updated.hotel_id) {
          this.loadMerchantMenu(updated.hotel_id);
        }
        this.toast.success(`${updated.name} updated`);
      },
      error: () => this.toast.error('Failed to update menu item')
    });
  }

  deleteMenuItem(id: number, hotelId: number) {
    this.api.deleteMenuItem(id).subscribe({
      next: () => {
        this.loadMerchantMenu(hotelId);
        this.toast.success('Menu item removed');
      },
      error: () => this.toast.error('Failed to remove menu item')
    });
  }

  addGlobalItems(items: Partial<MenuItem>[]) {
    // In a real app, we might have a bulk API. 
    // Here we'll just loop for simplicity or assume the API handles it if we had one.
    // Since we don't have a bulk API, we'll just call createMenuItem for each.
    items.forEach(item => {
      this.api.createMenuItem(item).subscribe({
        next: (newItem: MenuItem) => {
          this.globalMenu.update(current => [...current, newItem]);
          if (newItem.hotel_id) {
            this.loadMerchantMenu(newItem.hotel_id);
          }
        }
      });
    });
  }

  saveMerchantMenu(merchantId: number, items: MerchantMenuItem[]) {
    this.merchantMenus.update(current => ({
      ...current,
      [merchantId]: items
    }));
    return this.api.updateMerchantPricing(merchantId, items.map(i => ({ menu_id: i.id, price: i.merchantPrice ?? i.price })));
  }
}
