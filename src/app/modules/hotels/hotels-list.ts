import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../../services/catalog.service';
import { ToastService } from '../../services/toast.service';
import { ImageUploadService } from '../../services/image-upload.service';
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
  imageUpload = inject(ImageUploadService);
  
  // Menu Management
  showMenuModal = signal(false);
  showMenuItemModal = signal(false);
  selectedHotel = signal<Hotel | null>(null);
  editingMenuItemId = signal<number | null>(null);
  isUploading = signal(false);
  
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
    image_url: 'https://picsum.photos/seed/food/200/200',
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
      image_url: 'https://picsum.photos/seed/food/200/200',
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
      image_url: item.image_url || 'https://picsum.photos/seed/food/200/200',
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

  onMenuItemFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.isUploading.set(true);
      this.imageUpload.uploadImage(file).subscribe({
        next: (url) => {
          if (url) {
            this.menuItemForm.image_url = url;
            this.toast.success('Image uploaded successfully');
          } else {
            this.toast.error('Failed to upload image');
          }
          this.isUploading.set(false);
        },
        error: () => {
          this.toast.error('Failed to upload image');
          this.isUploading.set(false);
        }
      });
    }
  }
}
