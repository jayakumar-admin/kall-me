import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../../services/catalog.service';
import { ToastService } from '../../services/toast.service';
import { ImageUploadService } from '../../services/image-upload.service';
import { Hotel, MenuItem } from '../../models';
import { MENU_CATEGORIES } from '../../data/static-data';
import { ConfirmDialog } from '../../components/confirm-dialog/confirm-dialog.component';

import { MainSkeletonComponent } from '../../components/main-skeleton';

import { sortHotels, HotelSortOption } from '../../utils/hotel-sort';

import { SearchService } from '../../services/search.service';

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
  search = inject(SearchService);
  
  categories = MENU_CATEGORIES;

  // Search & Sorting
  searchTerm = signal('');
  sortMode = signal<HotelSortOption>('sequence');

  effectiveSearchTerm = computed(() => (this.searchTerm() || this.search.searchTerm() || '').toLowerCase().trim());

  displayedHotels = computed(() => {
    const term = this.effectiveSearchTerm();
    const hotels = this.catalog.hotels();
    let filtered = hotels;
    if (term) {
      filtered = filtered.filter(h => 
        (h.name && h.name.toLowerCase().includes(term)) ||
        (h.category && h.category.toLowerCase().includes(term)) ||
        (h.address && h.address.toLowerCase().includes(term))
      );
    }
    return sortHotels(filtered, this.sortMode());
  });

  onSearchChange(term: string) {
    this.searchTerm.set(term);
    this.search.setSearchTerm(term);
  }

  clearSearch() {
    this.searchTerm.set('');
    this.search.clearSearch();
  }

  // Reorder Sequence Modal State
  showReorderModal = signal(false);
  reorderList = signal<Hotel[]>([]);
  isSavingSequence = signal(false);

  openReorderModal() {
    // Current catalog hotels are already sorted by sequence / default alphabetical
    const current = sortHotels(this.catalog.hotels(), 'sequence');
    // Normalize into 1, 2, 3...
    const list = current.map((h, idx) => ({
      ...h,
      order_sequence: (h.order_sequence && h.order_sequence > 0) ? h.order_sequence : (idx + 1)
    }));
    this.reorderList.set(list);
    this.showReorderModal.set(true);
  }

  closeReorderModal() {
    this.showReorderModal.set(false);
  }

  moveHotelUp(index: number) {
    if (index <= 0) return;
    const list = [...this.reorderList()];
    const temp = list[index];
    list[index] = list[index - 1];
    list[index - 1] = temp;
    // Re-assign sequences 1..N based on new array positions
    const updated = list.map((h, idx) => ({ ...h, order_sequence: idx + 1 }));
    this.reorderList.set(updated);
  }

  moveHotelDown(index: number) {
    const list = [...this.reorderList()];
    if (index >= list.length - 1) return;
    const temp = list[index];
    list[index] = list[index + 1];
    list[index + 1] = temp;
    // Re-assign sequences 1..N based on new array positions
    const updated = list.map((h, idx) => ({ ...h, order_sequence: idx + 1 }));
    this.reorderList.set(updated);
  }

  onItemSequenceChange(hotelId: number, val: any) {
    const num = parseInt(val, 10);
    this.reorderList.update(list => 
      list.map(h => h.id === hotelId ? { ...h, order_sequence: isNaN(num) ? null : num } : h)
    );
  }

  autoSortAlphabetical() {
    const sorted = [...this.reorderList()].sort((a, b) => 
      (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base', numeric: true })
    );
    const updated = sorted.map((h, idx) => ({ ...h, order_sequence: idx + 1 }));
    this.reorderList.set(updated);
    this.toast.info('Hotels sorted alphabetically. Click Save Sequence to apply.');
  }

  normalizeSequences() {
    const sorted = sortHotels(this.reorderList(), 'sequence');
    const updated = sorted.map((h, idx) => ({ ...h, order_sequence: idx + 1 }));
    this.reorderList.set(updated);
  }

  saveReorderedSequence() {
    this.isSavingSequence.set(true);
    const sequences = this.reorderList().map((h, idx) => ({
      id: h.id,
      order_sequence: (h.order_sequence && h.order_sequence > 0) ? Number(h.order_sequence) : (idx + 1)
    }));

    this.catalog.updateHotelSequence(sequences).subscribe({
      next: () => {
        this.isSavingSequence.set(false);
        this.showReorderModal.set(false);
        this.toast.success('Hotel display sequence saved successfully');
      },
      error: () => {
        // Even if server returns error or 404, catalog service already updated signal & localStorage!
        this.isSavingSequence.set(false);
        this.showReorderModal.set(false);
        this.toast.success('Hotel sequence updated locally');
      }
    });
  }

  // Menu Management
  showMenuModal = signal(false);
  showMenuItemModal = signal(false);
  selectedHotel = signal<Hotel | null>(null);
  editingMenuItemId = signal<number | null>(null);
  isUploading = signal(false);
  
  showDeleteConfirm = signal(false);
  itemToDelete = signal<{ type: 'hotel' | 'menu', data: Hotel | MenuItem } | null>(null);
  
  modalMenuSearch = signal('');

  currentMenu = computed(() => {
    const hotel = this.selectedHotel();
    if (!hotel) return [];
    return this.catalog.hotelMenus()[hotel.id] || [];
  });

  filteredModalMenu = computed(() => {
    const items = this.currentMenu();
    const term = this.modalMenuSearch().toLowerCase().trim();
    if (!term) return items;
    return items.filter(i => 
      (i.name && i.name.toLowerCase().includes(term)) ||
      (i.category && i.category.toLowerCase().includes(term)) ||
      (i.description && i.description.toLowerCase().includes(term))
    );
  });

  menuItemForm = {
    name: '',
    price: 0,
    category: 'Veg biryani',
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
    this.modalMenuSearch.set('');
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
      category: 'Veg biryani',
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
