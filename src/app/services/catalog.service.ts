import { Injectable, signal, computed } from '@angular/core';
import { MenuItem, Merchant, MERCHANTS, MENU_ITEMS } from '../data/static-data';

export interface MerchantMenuItem extends MenuItem {
  merchantPrice?: number; // Override price for specific merchant
  isLinked?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CatalogService {
  // Global repository of all available menu items
  globalMenu = signal<MenuItem[]>(MENU_ITEMS);
  
  // List of merchants
  merchants = signal<Merchant[]>(MERCHANTS);

  // Map of merchant ID to their specific menu items (with custom prices)
  // In a real app, this would be fetched from backend
  merchantMenus = signal<Record<string, MerchantMenuItem[]>>({});

  constructor() {
    // Initialize some dummy data for existing merchants
    const initialMenus: Record<string, MerchantMenuItem[]> = {};
    this.merchants().forEach(m => {
      // Assign some random items to each merchant initially
      initialMenus[m.id] = this.globalMenu().slice(0, 5).map(item => ({
        ...item,
        merchantPrice: item.price, // Default to base price
        isLinked: true
      }));
    });
    this.merchantMenus.set(initialMenus);
  }

  // Add multiple items to global catalog
  addGlobalItems(items: Omit<MenuItem, 'id' | 'rating' | 'reviews'>[]) {
    const newItems: MenuItem[] = items.map(item => ({
      ...item,
      id: 'mi-' + Math.random().toString(36).substr(2, 9),
      image: item.image || 'https://picsum.photos/seed/' + item.name + '/200/200',
      rating: 0,
      reviews: '0'
    }));

    this.globalMenu.update(current => [...current, ...newItems]);
  }

  // Get menu for a specific merchant
  getMerchantMenu(merchantId: string) {
    return computed(() => this.merchantMenus()[merchantId] || []);
  }

  // Update merchant menu (add/remove/update price)
  updateMerchantMenu(merchantId: string, items: MerchantMenuItem[]) {
    this.merchantMenus.update(current => ({
      ...current,
      [merchantId]: items
    }));
  }

  // Add a new merchant
  addMerchant(merchant: Omit<Merchant, 'id' | 'rating' | 'reviews' | 'image'>) {
    const newMerchant: Merchant = {
      ...merchant,
      id: 'm-' + Math.random().toString(36).substr(2, 9),
      rating: 0,
      reviews: '0',
      image: 'https://picsum.photos/seed/' + merchant.name + '/300/200'
    };
    
    this.merchants.update(current => [...current, newMerchant]);
    
    // Initialize empty menu for new merchant
    this.merchantMenus.update(current => ({
      ...current,
      [newMerchant.id]: []
    }));
  }
}
