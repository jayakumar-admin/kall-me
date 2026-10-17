import { Injectable, signal, computed, inject } from '@angular/core';
import { MenuItem } from '../data/static-data';
import { ApiService } from './api.service';
import { Hotel } from '../models';
import { ToastService } from './toast.service';
import { sortHotels } from '../utils/hotel-sort';

export interface HotelMenuItem extends MenuItem {
  hotelPrice?: number;
  isLinked?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CatalogService {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  private readonly LOCAL_STORAGE_KEY = 'kallme_hotel_order_sequences';

  // Global repository of all available menu items
  globalMenu = signal<MenuItem[]>([]);
  
  // List of hotels
  hotels = signal<Hotel[]>([]);
  loading = signal(true);

  // Map of hotel ID to their specific menu items
  hotelMenus = signal<Record<string, HotelMenuItem[]>>({});

  constructor() {
    this.loadInitialData();
  }

  private getStoredSequences(): Record<number, number> {
    try {
      const data = localStorage.getItem(this.LOCAL_STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  private setStoredSequences(map: Record<number, number>) {
    try {
      localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(map));
    } catch {
      // ignore
    }
  }

  loadInitialData() {
    this.loading.set(true);
    this.api.getHotels().subscribe({
      next: (hotels) => {
        const stored = this.getStoredSequences();
        const merged = hotels.map(h => {
          if ((h.order_sequence === undefined || h.order_sequence === null) && stored[h.id] !== undefined) {
            return { ...h, order_sequence: stored[h.id] };
          }
          return h;
        });
        this.hotels.set(sortHotels(merged));
        // Load menus for each hotel
        hotels.forEach(hotel => this.loadHotelMenu(hotel.id));
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

  loadHotelMenu(hotelId: number) {
    this.api.getMenus(hotelId).subscribe({
      next: (items) => {
        this.hotelMenus.update(current => ({
          ...current,
          [hotelId]: items.map(item => ({ ...item, hotelPrice: item.price, isLinked: true }))
        }));
      },
      error: () => {
        this.toast.error(`Failed to load menu for hotel ${hotelId}`);
      }
    });
  }

  // Add a new hotel
  addHotel(hotel: Partial<Hotel>) {
    return this.api.createHotel(hotel);
  }

  // Update hotel
  updateHotel(id: number, hotel: Partial<Hotel>) {
    return this.api.updateHotel(id, hotel);
  }

  // Update hotel order sequences
  updateHotelSequence(sequences: { id: number; order_sequence: number }[]) {
    // 1. Update localStorage cache
    const stored = this.getStoredSequences();
    sequences.forEach(s => {
      stored[s.id] = s.order_sequence;
    });
    this.setStoredSequences(stored);

    // 2. Update local signal immediately
    this.hotels.update(current => {
      const map = new Map(sequences.map(s => [s.id, s.order_sequence]));
      const updated = current.map(h => {
        if (map.has(h.id)) {
          return { ...h, order_sequence: map.get(h.id)! };
        }
        return h;
      });
      return sortHotels(updated);
    });

    // 3. Call backend API
    return this.api.reorderHotels(sequences);
  }

  getHotel(id: number) {
    return this.api.getHotel(id);
  }

  // Delete hotel
  deleteHotel(id: number) {
    this.api.deleteHotel(id).subscribe({
      next: () => {
        this.hotels.update(current => current.filter(m => m.id !== id));
        this.toast.success('Hotel removed successfully');
      },
      error: () => this.toast.error('Failed to remove hotel')
    });
  }

  getHotelMenu(hotelId: number) {
    return computed(() => this.hotelMenus()[hotelId] || []);
  }

  addMenuItem(item: Partial<MenuItem>) {
    this.api.createMenuItem(item).subscribe({
      next: (newItem) => {
        if (newItem.hotel_id) {
          this.loadHotelMenu(newItem.hotel_id);
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
          this.loadHotelMenu(updated.hotel_id);
        }
        this.toast.success(`${updated.name} updated`);
      },
      error: () => this.toast.error('Failed to update menu item')
    });
  }

  deleteMenuItem(id: number, hotelId: number) {
    this.api.deleteMenuItem(id).subscribe({
      next: () => {
        this.loadHotelMenu(hotelId);
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
            this.loadHotelMenu(newItem.hotel_id);
          }
        }
      });
    });
  }

  saveHotelMenu(hotelId: number, items: HotelMenuItem[]) {
    this.hotelMenus.update(current => ({
      ...current,
      [hotelId]: items
    }));
    return this.api.updateHotelPricing(hotelId, items.map(i => ({ menu_id: i.id, price: i.hotelPrice ?? i.price })));
  }
}
