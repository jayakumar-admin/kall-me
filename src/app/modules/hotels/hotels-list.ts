import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../../services/catalog.service';
import { ToastService } from '../../services/toast.service';
import { Hotel, MenuItem } from '../../models';
import { ConfirmDialog } from '../../components/confirm-dialog/confirm-dialog.component';

import { MainSkeletonComponent } from '../../components/main-skeleton';

@Component({
  selector: 'app-hotels-list',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, MainSkeletonComponent, RouterLink, ConfirmDialog],
  templateUrl: './hotels-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HotelsList {
  catalog = inject(CatalogService);
  toast = inject(ToastService);
  
  // Menu Management
  showMenuModal = signal(false);
  showMenuItemModal = signal(false);
  selectedHotel = signal<Hotel | null>(null);
  editingMenuItemId = signal<number | null>(null);
  
  showDeleteConfirm = signal(false);
  itemToDelete = signal<{ type: 'hotel' | 'menu', data: Hotel | MenuItem } | null>(null);
  
  currentMenu = computed(() => {
    const hotel = this.selectedHotel();
    if (!hotel) return [];
    return this.catalog.hotelMenus()[hotel.id] || [];
  });

  menuItemForm = {
    name: '',
    price: 0,
    category: 'Veg',
    description: '',
    is_available: true,
    hotel_id: 0
  };

  deleteHotel(hotel: Hotel) {
    this.itemToDelete.set({ type: 'hotel', data: hotel });
    this.showDeleteConfirm.set(true);
  }

  deleteMenuItem(item: MenuItem) {
    this.itemToDelete.set({ type: 'menu', data: item });
    this.showDeleteConfirm.set(true);
  }

  confirmDelete() {
    const item = this.itemToDelete();
    if (!item) return;

    if (item.type === 'hotel') {
      this.catalog.deleteHotel((item.data as Hotel).id);
    } else {
      const menuItem = item.data as MenuItem;
      this.catalog.deleteMenuItem(menuItem.id, menuItem.hotel_id);
    }
    this.showDeleteConfirm.set(false);
  }

  // Menu Methods
  viewMenu(hotel: Hotel) {
    this.selectedHotel.set(hotel);
    this.catalog.loadHotelMenu(hotel.id);
    this.showMenuModal.set(true);
  }

  openAddMenuItemModal() {
    const hotel = this.selectedHotel();
    if (!hotel) return;
    
    this.editingMenuItemId.set(null);
    this.menuItemForm = {
      name: '',
      price: 0,
      category: 'Veg',
      description: '',
      is_available: true,
      hotel_id: hotel.id
    };
    this.showMenuItemModal.set(true);
  }

  editMenuItem(item: MenuItem) {
    this.editingMenuItemId.set(item.id);
    this.menuItemForm = {
      name: item.name,
      price: item.price,
      category: item.category,
      description: item.description,
      is_available: item.is_available ?? true,
      hotel_id: item.hotel_id
    };
    this.showMenuItemModal.set(true);
  }

  saveMenuItem() {
    if (!this.menuItemForm.name || this.menuItemForm.price <= 0) {
      this.toast.error('Please enter valid name and price');
      return;
    }

    if (this.editingMenuItemId()) {
      this.catalog.updateMenuItem(this.editingMenuItemId()!, this.menuItemForm);
    } else {
      this.catalog.addMenuItem(this.menuItemForm);
    }
    this.showMenuItemModal.set(false);
  }
}
