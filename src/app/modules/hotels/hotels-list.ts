import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { CatalogService } from '../../services/catalog.service';
import { ToastService } from '../../services/toast.service';
import { Hotel, MenuItem } from '../../models';

import { MainSkeletonComponent } from '../../components/main-skeleton';

@Component({
  selector: 'app-hotels-list',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, MainSkeletonComponent],
  template: `
    @if (catalog.loading()) {
      <app-main-skeleton />
    } @else {
      <div class="h-full overflow-y-auto p-6 custom-scrollbar space-y-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-display font-bold text-slate-900 dark:text-white">Manage Hotels</h1>
            <p class="text-slate-500 dark:text-slate-400">Add and manage restaurant partners.</p>
          </div>
          <button (click)="openAddModal()" class="btn-primary flex items-center gap-2">
            <mat-icon>add</mat-icon>
            Add Hotel
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          @for (hotel of catalog.merchants(); track hotel.id) {
            <div class="card !p-0 overflow-hidden group hover:shadow-lg transition-all">
              <div class="h-48 overflow-hidden relative">
                <img [src]="hotel.image_url || 'https://picsum.photos/seed/' + hotel.name + '/400/300'" [alt]="hotel.name" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
                <div class="absolute top-4 right-4">
                  <span [class]="hotel.status === 'active' ? 'bg-green-500' : 'bg-slate-500'" class="px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider">
                    {{ hotel.status }}
                  </span>
                </div>
              </div>
              <div class="p-6">
                <div class="flex justify-between items-start mb-2">
                  <h3 class="text-xl font-bold text-slate-900 dark:text-white">{{ hotel.name }}</h3>
                  <div class="flex items-center gap-1 text-[#FFC107]">
                    <mat-icon class="text-sm">star</mat-icon>
                    <span class="text-sm font-bold">{{ hotel.rating }}</span>
                  </div>
                </div>
                <p class="text-sm text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-1">
                  <mat-icon class="text-xs">restaurant</mat-icon>
                  {{ hotel.category }}
                </p>
                
                <div class="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5">
                  <div>
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Commission</p>
                    <p class="text-lg font-bold text-slate-900 dark:text-white">{{ hotel.commission_rate }}%</p>
                  </div>
                  <div class="flex gap-2">
                    <button (click)="viewMenu(hotel)" class="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-indigo-500 hover:text-white transition-all" title="View Menu">
                      <mat-icon>restaurant_menu</mat-icon>
                    </button>
                    <button (click)="editHotel(hotel)" class="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-[#FFC107] hover:text-black transition-all" title="Edit Hotel">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button (click)="deleteHotel(hotel)" class="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-red-500 hover:text-white transition-all" title="Delete Hotel">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    }

    <!-- Add/Edit Hotel Modal -->
    @if (showModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div class="bg-white dark:bg-[#1E293B] rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-100 dark:border-white/10 animate-in fade-in zoom-in duration-200">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-slate-900 dark:text-white">{{ editingId() ? 'Edit Partner' : 'Add New Partner' }}</h2>
            <button (click)="showModal.set(false)" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="space-y-4">
            <div>
              <label for="restaurantName" class="text-xs font-bold text-slate-500 mb-1.5 block">Restaurant Name</label>
              <input id="restaurantName" type="text" [(ngModel)]="hotelForm.name" class="input-field" placeholder="e.g. Spice Garden">
            </div>
            
            <div>
              <label for="restaurantCategory" class="text-xs font-bold text-slate-500 mb-1.5 block">Category</label>
              <select id="restaurantCategory" [(ngModel)]="hotelForm.category" class="input-field appearance-none">
                <option value="Indian">Indian</option>
                <option value="Chinese">Chinese</option>
                <option value="Italian">Italian</option>
                <option value="Fast Food">Fast Food</option>
                <option value="Bakery">Bakery</option>
              </select>
            </div>

            <div>
              <label for="restaurantAddress" class="text-xs font-bold text-slate-500 mb-1.5 block">Address</label>
              <input id="restaurantAddress" type="text" [(ngModel)]="hotelForm.address" class="input-field" placeholder="e.g. 123 Main St">
            </div>

            <div class="pt-4 flex gap-3">
              <button (click)="showModal.set(false)" class="flex-1 py-3 rounded-xl border border-slate-200 dark:border-white/10 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">Cancel</button>
              <button (click)="saveHotel()" class="flex-1 btn-primary">Save Partner</button>
            </div>
          </div>
        </div>
      </div>
    }
    <!-- Menu Management Modal -->
    @if (showMenuModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div class="bg-white dark:bg-[#1E293B] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 dark:border-white/10 animate-in fade-in zoom-in duration-200">
          <div class="p-6 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
            <div>
              <h2 class="text-xl font-bold text-slate-900 dark:text-white">Menu: {{ selectedHotel()?.name }}</h2>
              <p class="text-xs text-slate-500">Manage items, prices, and availability.</p>
            </div>
            <div class="flex items-center gap-4">
              <button (click)="openAddMenuItemModal()" class="btn-primary !py-2 !px-4 text-xs flex items-center gap-2">
                <mat-icon class="text-sm">add</mat-icon>
                Add Item
              </button>
              <button (click)="showMenuModal.set(false)" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              @for (item of currentMenu(); track item.id) {
                <div class="p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 flex items-center gap-4 group">
                  <div class="w-16 h-16 rounded-lg overflow-hidden shrink-0">
                    <img [src]="item.image_url || 'https://picsum.photos/seed/' + item.name + '/100/100'" [alt]="item.name" class="w-full h-full object-cover">
                  </div>
                  <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-slate-900 dark:text-white truncate">{{ item.name }}</h4>
                    <p class="text-xs text-slate-500 truncate">{{ item.description }}</p>
                    <div class="flex items-center gap-3 mt-1">
                      <span class="text-sm font-bold text-indigo-600 dark:text-indigo-400">₹{{ item.price }}</span>
                      <span [class]="item.is_available ? 'text-green-500' : 'text-red-500'" class="text-[10px] font-bold uppercase">
                        {{ item.is_available ? 'Available' : 'Sold Out' }}
                      </span>
                    </div>
                  </div>
                  <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button (click)="editMenuItem(item)" class="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400">
                      <mat-icon class="text-sm">edit</mat-icon>
                    </button>
                    <button (click)="deleteMenuItem(item)" class="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400">
                      <mat-icon class="text-sm">delete</mat-icon>
                    </button>
                  </div>
                </div>
              } @empty {
                <div class="col-span-full py-12 text-center">
                  <mat-icon class="text-4xl text-slate-300 mb-2">restaurant_menu</mat-icon>
                  <p class="text-slate-500">No items in this menu yet.</p>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Add/Edit Menu Item Modal -->
    @if (showMenuItemModal()) {
      <div class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div class="bg-white dark:bg-[#1E293B] rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-100 dark:border-white/10 animate-in fade-in zoom-in duration-200">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-slate-900 dark:text-white">{{ editingMenuItemId() ? 'Edit Item' : 'Add Menu Item' }}</h2>
            <button (click)="showMenuItemModal.set(false)" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="space-y-4">
            <div>
              <label for="itemName" class="text-xs font-bold text-slate-500 mb-1.5 block">Item Name</label>
              <input id="itemName" type="text" [(ngModel)]="menuItemForm.name" class="input-field" placeholder="e.g. Paneer Butter Masala">
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="itemPrice" class="text-xs font-bold text-slate-500 mb-1.5 block">Price (₹)</label>
                <input id="itemPrice" type="number" [(ngModel)]="menuItemForm.price" class="input-field" placeholder="0.00">
              </div>
              <div>
                <label for="itemCategory" class="text-xs font-bold text-slate-500 mb-1.5 block">Category</label>
                <select id="itemCategory" [(ngModel)]="menuItemForm.category" class="input-field appearance-none">
                  <option value="Veg">Veg</option>
                  <option value="Non-Veg">Non-Veg</option>
                  <option value="Beverage">Beverage</option>
                  <option value="Dessert">Dessert</option>
                </select>
              </div>
            </div>

            <div>
              <label for="itemDescription" class="text-xs font-bold text-slate-500 mb-1.5 block">Description</label>
              <textarea id="itemDescription" [(ngModel)]="menuItemForm.description" class="input-field min-h-[80px]" placeholder="Brief description of the dish..."></textarea>
            </div>

            <div class="flex items-center gap-2">
              <input type="checkbox" id="isAvailable" [(ngModel)]="menuItemForm.is_available" class="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500">
              <label for="isAvailable" class="text-sm font-medium text-slate-700 dark:text-slate-300">Available for ordering</label>
            </div>

            <div class="pt-4 flex gap-3">
              <button (click)="showMenuItemModal.set(false)" class="flex-1 py-3 rounded-xl border border-slate-200 dark:border-white/10 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">Cancel</button>
              <button (click)="saveMenuItem()" class="flex-1 btn-primary">Save Item</button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HotelsList {
  catalog = inject(CatalogService);
  toast = inject(ToastService);
  showModal = signal(false);
  editingId = signal<number | null>(null);
  
  // Menu Management
  showMenuModal = signal(false);
  showMenuItemModal = signal(false);
  selectedHotel = signal<Hotel | null>(null);
  editingMenuItemId = signal<number | null>(null);
  
  currentMenu = computed(() => {
    const hotel = this.selectedHotel();
    if (!hotel) return [];
    return this.catalog.merchantMenus()[hotel.id] || [];
  });

  hotelForm = {
    name: '',
    category: 'Indian',
    address: ''
  };

  menuItemForm = {
    name: '',
    price: 0,
    category: 'Veg',
    description: '',
    is_available: true,
    hotel_id: 0
  };

  openAddModal() {
    this.editingId.set(null);
    this.hotelForm = { name: '', category: 'Indian', address: '' };
    this.showModal.set(true);
  }

  saveHotel() {
    if (!this.hotelForm.name) {
      this.toast.error('Please enter a restaurant name');
      return;
    }
    
    if (this.editingId()) {
      this.catalog.updateMerchant(this.editingId()!, this.hotelForm);
    } else {
      this.catalog.addMerchant(this.hotelForm);
    }
    
    this.showModal.set(false);
  }

  editHotel(hotel: Hotel) {
    this.editingId.set(hotel.id);
    this.hotelForm = {
      name: hotel.name,
      category: hotel.category,
      address: hotel.address
    };
    this.showModal.set(true);
  }

  deleteHotel(hotel: Hotel) {
    if (confirm(`Are you sure you want to remove ${hotel.name}?`)) {
      this.catalog.deleteMerchant(hotel.id);
    }
  }

  // Menu Methods
  viewMenu(hotel: Hotel) {
    this.selectedHotel.set(hotel);
    this.catalog.loadMerchantMenu(hotel.id);
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

  deleteMenuItem(item: MenuItem) {
    if (confirm(`Are you sure you want to remove ${item.name}?`)) {
      this.catalog.deleteMenuItem(item.id, item.hotel_id);
    }
  }
}
