import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { CatalogService, HotelMenuItem } from '../../../services/catalog.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-hotel-menu-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, DragDropModule],
  template: `
    <div class="h-full overflow-y-auto p-6 custom-scrollbar space-y-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-display font-black text-[#1A1A1A] dark:text-white uppercase tracking-tight">Hotel Menu & Pricing</h1>
          <p class="text-slate-500 dark:text-slate-400">Drag items to assign to hotel and override prices.</p>
        </div>
        
        <!-- Hotel Selector -->
        <div class="relative w-64">
          <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-[#FFC107] text-sm">storefront</mat-icon>
          <select 
            [ngModel]="selectedHotelId()"
            (ngModelChange)="selectedHotelId.set($event)"
            class="w-full bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/5 rounded-xl pl-10 pr-8 py-2.5 text-sm font-bold text-[#1A1A1A] dark:text-white outline-none focus:ring-2 focus:ring-[#FFC107]/20 appearance-none shadow-sm cursor-pointer"
            aria-label="Select Hotel"
          >
            @for (m of catalog.hotels(); track m.id) {
              <option [value]="m.id">{{ m.name }}</option>
            }
          </select>
          <mat-icon class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">expand_more</mat-icon>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-200px)]" cdkDropListGroup>
        <!-- Left: Global Catalog -->
        <div class="flex flex-col gap-4 h-full">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-[#1A1A1A] dark:text-white flex items-center gap-2">
              <mat-icon class="text-slate-400">public</mat-icon>
              Global Catalog
              <span class="bg-slate-100 dark:bg-white/10 text-xs px-2 py-0.5 rounded-full text-slate-500 dark:text-slate-300">{{ availableItems().length }}</span>
            </h3>
            <div class="relative">
              <mat-icon class="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">search</mat-icon>
              <input 
                type="text" 
                placeholder="Search catalog..." 
                class="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/5 rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-[#FFC107] w-48 transition-all"
                aria-label="Search catalog"
              >
            </div>
          </div>

          <div 
            cdkDropList
            [cdkDropListData]="availableItems()"
            class="flex-1 bg-slate-50 dark:bg-[#0F172A]/50 rounded-2xl border border-slate-200 dark:border-white/5 p-4 overflow-y-auto custom-scrollbar space-y-3"
          >
            @for (item of availableItems(); track item.id) {
              <div 
                cdkDrag
                class="bg-white dark:bg-[#1E293B] p-3 rounded-xl border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing flex items-center gap-3 group"
              >
                <div class="w-10 h-10 rounded-lg bg-slate-100 dark:bg-white/5 overflow-hidden shrink-0">
                  <img [src]="item.image_url" [alt]="item.name" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity">
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-bold text-sm text-[#1A1A1A] dark:text-white truncate">{{ item.name }}</p>
                  <p class="text-[10px] text-slate-500 dark:text-slate-400">{{ item.category }}</p>
                </div>
                <div class="text-right">
                  <p class="font-mono font-bold text-sm text-slate-400">₹{{ item.price }}</p>
                  <p class="text-[10px] text-slate-400">Base Price</p>
                </div>
                <mat-icon class="text-slate-300 dark:text-slate-600">drag_indicator</mat-icon>
              </div>
            }
          </div>
        </div>

        <!-- Right: Hotel Menu -->
        <div class="flex flex-col gap-4 h-full">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-[#1A1A1A] dark:text-white flex items-center gap-2">
              <mat-icon class="text-[#FFC107]">storefront</mat-icon>
              Hotel Menu
              <span class="bg-[#FFC107]/10 text-xs px-2 py-0.5 rounded-full text-[#FFC107] font-bold">{{ hotelItems().length }}</span>
            </h3>
            <button (click)="saveChanges()" class="text-xs font-bold text-[#FFC107] hover:underline">Save Changes</button>
          </div>

          <div 
            cdkDropList
            [cdkDropListData]="hotelItems()"
            (cdkDropListDropped)="drop($event)"
            class="flex-1 bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-white/5 p-4 overflow-y-auto custom-scrollbar space-y-3 shadow-sm"
          >
            @for (item of hotelItems(); track item.id) {
              <div 
                cdkDrag
                class="bg-[#F8F9FA] dark:bg-[#0F172A] p-3 rounded-xl border border-slate-200 dark:border-white/5 group hover:border-[#FFC107]/50 transition-colors"
              >
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-white dark:bg-white/5 overflow-hidden shrink-0 relative">
                    <img [src]="item.image_url" [alt]="item.name" class="w-full h-full object-cover">
                    <div class="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-bold text-sm text-[#1A1A1A] dark:text-white truncate">{{ item.name }}</p>
                    <div class="flex items-center gap-2 mt-1">
                      <span class="text-[10px] bg-slate-200 dark:bg-white/10 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400">{{ item.category }}</span>
                    </div>
                  </div>
                  
                  <!-- Price Editor -->
                  <div class="flex flex-col items-end gap-1">
                    <label [for]="'price-' + item.id" class="text-[8px] font-bold uppercase tracking-wider text-slate-400">Selling Price</label>
                    <div class="relative w-24">
                      <span class="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                      <input 
                        [id]="'price-' + item.id"
                        type="number" 
                        [ngModel]="item.hotelPrice"
                        (ngModelChange)="updatePrice(item, $event)"
                        class="w-full bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/10 rounded-lg pl-5 pr-2 py-1 text-sm font-bold text-right outline-none focus:ring-1 focus:ring-[#FFC107] focus:border-[#FFC107] transition-all"
                      >
                    </div>
                  </div>
                  
                  <button (click)="removeItem(item)" class="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 rounded-lg transition-all">
                    <mat-icon class="text-sm">close</mat-icon>
                  </button>
                </div>
              </div>
            }
            
            @if (hotelItems().length === 0) {
              <div class="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-xl">
                <mat-icon class="scale-150 mb-2 opacity-50">drag_indicator</mat-icon>
                <p class="text-sm font-medium">Drag items here from the catalog</p>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HotelMenuEditor {
  catalog = inject(CatalogService);
  toast = inject(ToastService);
  
  selectedHotelId = signal<number | null>(null);

  constructor() {
    // Set initial hotel if available
    const hotels = this.catalog.hotels();
    if (hotels.length > 0) {
      this.selectedHotelId.set(hotels[0].id);
    }
  }

  hotelItems = computed(() => {
    const id = this.selectedHotelId();
    if (id === null) return [];
    return this.catalog.hotelMenus()[id] || [];
  });

  availableItems = computed(() => {
    const id = this.selectedHotelId();
    if (id === null) return this.catalog.globalMenu();
    const hotelItemIds = new Set((this.catalog.hotelMenus()[id] || []).map(i => i.id));
    return this.catalog.globalMenu().filter(i => !hotelItemIds.has(i.id));
  });

  drop(event: CdkDragDrop<HotelMenuItem[]>) {
    const id = this.selectedHotelId();
    if (id === null) return;

    if (event.previousContainer === event.container) {
      const currentItems = [...this.hotelItems()];
      moveItemInArray(currentItems, event.previousIndex, event.currentIndex);
      this.catalog.hotelMenus.update(current => ({
        ...current,
        [id]: currentItems
      }));
    } else {
      const itemToLink = event.previousContainer.data[event.previousIndex];
      
      const newItem: HotelMenuItem = {
        ...itemToLink,
        hotelPrice: itemToLink.price,
        isLinked: true
      };

      const currentHotelItems = [...this.hotelItems()];
      currentHotelItems.splice(event.currentIndex, 0, newItem);
      
      this.catalog.hotelMenus.update(current => ({
        ...current,
        [id]: currentHotelItems
      }));
      this.toast.success(`Added ${itemToLink.name} to hotel menu`);
    }
  }

  removeItem(item: HotelMenuItem) {
    const id = this.selectedHotelId();
    if (id === null) return;

    const currentItems = this.hotelItems().filter(i => i.id !== item.id);
    this.catalog.hotelMenus.update(current => ({
      ...current,
      [id]: currentItems
    }));
    this.toast.info(`Removed ${item.name} from hotel menu`);
  }

  updatePrice(item: HotelMenuItem, newPrice: number) {
    item.hotelPrice = newPrice;
  }

  saveChanges() {
    const id = this.selectedHotelId();
    if (id === null) return;
    this.catalog.saveHotelMenu(id, this.hotelItems()).subscribe({
      next: () => this.toast.success('Hotel menu and pricing saved successfully'),
      error: () => this.toast.error('Failed to save hotel menu')
    });
  }
}
