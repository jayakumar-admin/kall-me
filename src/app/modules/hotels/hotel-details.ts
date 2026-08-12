import { Component, inject, computed, signal, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { CatalogService, HotelMenuItem } from '../../services/catalog.service';
import { OrderService } from '../../services/order.service';
import { ToastService } from '../../services/toast.service';
import { ImageUploadService } from '../../services/image-upload.service';
import { MenuItem } from '../../models';
import { MENU_CATEGORIES } from '../../data/static-data';
import { ConfirmDialog } from '../../components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-hotel-details',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterLink, FormsModule, ConfirmDialog],
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
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold">Menu</h2>
            <button (click)="openAddMenuItemModal()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5">
              <mat-icon class="text-sm">add</mat-icon>
              Add Item
            </button>
          </div>
          
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            @for (item of menuItems(); track item.id) {
              <div class="p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 flex items-center gap-4 group">
                <div class="w-16 h-16 rounded-lg overflow-hidden shrink-0">
                  <img [src]="item.image_url || 'https://picsum.photos/seed/' + item.name + '/100/100'" [alt]="item.name" class="w-full h-full object-cover">
                </div>
                <div class="flex-1 min-w-0">
                  <h4 class="font-bold text-slate-900 dark:text-white truncate">{{ item.name }}</h4>
                  <p class="text-xs text-slate-500 truncate">{{ item.description }}</p>
                  <div class="flex items-center gap-3 mt-1">
                    <span [class]="item.category === 'Veg' ? 'text-green-500' : 'text-rose-500'" class="text-[10px] font-bold uppercase">
                      {{ item.category }}
                    </span>
                   
                  </div>
                </div>
                
                <div class="flex items-center gap-3">
                  <div class="flex items-center gap-1">
                    <span class="text-xs text-slate-500">₹</span>
                    <input type="number" [(ngModel)]="editingPrices[item.id]" class="w-20 p-1 rounded border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1E293B] text-right text-sm">
                    <button (click)="updatePrice(item)" class="bg-indigo-600 text-white px-2 py-1 rounded text-xs font-semibold">Save</button>
                  </div>
                  <div class="flex gap-1">
                    <button (click)="editMenuItem(item)" class="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400" title="Edit Item">
                      <mat-icon class="text-sm">edit</mat-icon>
                    </button>
                    <button (click)="deleteMenuItem(item)" class="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400" title="Delete Item">
                      <mat-icon class="text-sm">delete</mat-icon>
                    </button>
                  </div>
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
      } @else {
        <p>Loading hotel details...</p>
      }
    </div>

    <!-- Add/Edit Menu Item Modal -->
    @if (showMenuItemModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div class="bg-white dark:bg-[#1E293B] rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 dark:border-white/10 animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col overflow-hidden">
          <div class="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5 shrink-0">
            <h2 class="text-xl font-bold text-slate-900 dark:text-white">{{ editingMenuItemId() ? 'Edit Item' : 'Add Menu Item' }}</h2>
            <button (click)="showMenuItemModal.set(false)" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
            <div>
              <label for="menu-item-image-input" class="text-xs font-bold text-slate-500 mb-1.5 block">Item Image</label>
              <div class="flex items-center gap-4">
                <div class="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 shrink-0 relative group">
                  <img [src]="menuItemForm.image_url" alt="Item image" class="w-full h-full object-cover">
                  <div class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <mat-icon class="text-white">upload</mat-icon>
                  </div>
                  <label class="absolute inset-0 w-full h-full cursor-pointer" for="menu-item-image-input">
                    <input 
                      id="menu-item-image-input"
                      type="file" 
                      (change)="onMenuItemFileSelected($event)"
                      accept="image/*"
                      class="opacity-0 w-full h-full cursor-pointer"
                      [disabled]="isUploading()"
                    >
                  </label>
                  @if (isUploading()) {
                    <div class="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <mat-icon class="text-white animate-spin">refresh</mat-icon>
                    </div>
                  }
                </div>
                <div class="flex-1">
                  <p class="text-xs text-slate-500 dark:text-slate-400">Upload an image for this menu item. Recommended size: 200x200px.</p>
                </div>
              </div>
            </div>

            <div>
              <label for="itemName" class="text-xs font-bold text-slate-500 mb-1.5 block">Item Name</label>
              <input id="itemName" type="text" [(ngModel)]="menuItemForm.name" class="w-full p-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Paneer Butter Masala">
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="itemPrice" class="text-xs font-bold text-slate-500 mb-1.5 block">Price (₹)</label>
                <input id="itemPrice" type="number" [(ngModel)]="menuItemForm.price" class="w-full p-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0.00">
              </div>
              <div>
                <label for="itemCategory" class="text-xs font-bold text-slate-500 mb-1.5 block">Category</label>
                <select id="itemCategory" [(ngModel)]="menuItemForm.category" class="w-full p-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none">
                  @for (cat of categories; track cat) {
                    <option [value]="cat">{{ cat }}</option>
                  }
                </select>
              </div>
            </div>

            <div>
              <label for="itemDescription" class="text-xs font-bold text-slate-500 mb-1.5 block">Description</label>
              <textarea id="itemDescription" [(ngModel)]="menuItemForm.description" class="w-full p-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]" placeholder="Brief description of the dish..."></textarea>
            </div>

            <div class="flex items-center gap-2">
              <input type="checkbox" id="isAvailable" [(ngModel)]="menuItemForm.is_available" class="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500">
              <label for="isAvailable" class="text-sm font-medium text-slate-700 dark:text-slate-300">Available for ordering</label>
            </div>

            <div class="pt-4 flex gap-3">
              <button (click)="showMenuItemModal.set(false)" class="flex-1 py-3 rounded-xl border border-slate-200 dark:border-white/10 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">Cancel</button>
              <button (click)="saveMenuItem()" [disabled]="isUploading()" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
                @if (isUploading()) {
                  <span class="flex items-center justify-center gap-2">
                    <mat-icon class="animate-spin text-sm">refresh</mat-icon>
                    Uploading...
                  </span>
                } @else {
                  Save Item
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    @if (showDeleteConfirm()) {
      <app-confirm-dialog
        [title]="'Confirm Delete'"
        [message]="'Are you sure you want to remove this menu item?'"
        (confirmed)="confirmDelete()"
        (cancelled)="showDeleteConfirm.set(false)">
      </app-confirm-dialog>
    }
  `
})
export class HotelDetails implements OnInit {
  private route = inject(ActivatedRoute);
  private catalog = inject(CatalogService);
  private orderService = inject(OrderService);
  private toast = inject(ToastService);
  private imageUpload = inject(ImageUploadService);

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

  // Menu Item Modal & Form state
  categories = MENU_CATEGORIES;

  showMenuItemModal = signal(false);
  editingMenuItemId = signal<number | null>(null);
  isUploading = signal(false);
  showDeleteConfirm = signal(false);
  itemToDelete = signal<MenuItem | null>(null);

  menuItemForm = {
    name: '',
    price: 0,
    category: 'Veg biryani',
    description: '',
    image_url: 'https://picsum.photos/seed/food/200/200',
    is_available: true,
    hotel_id: 0
  };

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
          this.toast.success('Price updated successfully');
        },
        error: () => this.toast.error('Failed to update price')
      });
    }
  }

  openAddMenuItemModal() {
    this.editingMenuItemId.set(null);
    this.menuItemForm = {
      name: '',
      price: 0,
      category: 'Veg biryani',
      description: '',
      image_url: 'https://picsum.photos/seed/food/200/200',
      is_available: true,
      hotel_id: this.hotelId()
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

  deleteMenuItem(item: MenuItem) {
    this.itemToDelete.set(item);
    this.showDeleteConfirm.set(true);
  }

  confirmDelete() {
    const item = this.itemToDelete();
    if (!item) return;

    this.catalog.deleteMenuItem(item.id, item.hotel_id);
    this.showDeleteConfirm.set(false);
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
