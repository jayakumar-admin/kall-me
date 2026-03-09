import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { CatalogService } from '../../services/catalog.service';
import { ToastService } from '../../services/toast.service';
import { Merchant } from '../../data/static-data';

@Component({
  selector: 'app-hotels-list',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  template: `
    <div class="h-full overflow-y-auto p-6 custom-scrollbar space-y-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-display font-bold text-slate-900 dark:text-white">Manage Hotels</h1>
          <p class="text-slate-500 dark:text-slate-400">Add and manage restaurant partners.</p>
        </div>
        <button (click)="showAddModal.set(true)" class="btn-primary flex items-center gap-2">
          <mat-icon>add</mat-icon>
          Add Hotel
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        @for (hotel of catalog.merchants(); track hotel.id) {
          <div class="card !p-0 overflow-hidden group hover:shadow-lg transition-all">
            <div class="h-48 overflow-hidden relative">
              <img [src]="hotel.image" [alt]="hotel.name" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
              <div class="absolute top-4 right-4">
                <span class="bg-green-500 px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider">
                  Active
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
                  <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reviews</p>
                  <p class="text-lg font-bold text-slate-900 dark:text-white">{{ hotel.reviews }}</p>
                </div>
                <div class="flex gap-2">
                  <button (click)="editHotel(hotel)" class="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-[#FFC107] hover:text-black transition-all">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button (click)="deleteHotel(hotel)" class="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-red-500 hover:text-white transition-all">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    </div>

    <!-- Add Hotel Modal -->
    @if (showAddModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div class="bg-white dark:bg-[#1E293B] rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-100 dark:border-white/10 animate-in fade-in zoom-in duration-200">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-slate-900 dark:text-white">Add New Partner</h2>
            <button (click)="showAddModal.set(false)" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="space-y-4">
            <div>
              <label for="restaurantName" class="text-xs font-bold text-slate-500 mb-1.5 block">Restaurant Name</label>
              <input id="restaurantName" type="text" [(ngModel)]="newHotel.name" class="input-field" placeholder="e.g. Spice Garden">
            </div>
            
            <div>
              <label for="restaurantCategory" class="text-xs font-bold text-slate-500 mb-1.5 block">Category</label>
              <select id="restaurantCategory" [(ngModel)]="newHotel.category" class="input-field appearance-none">
                <option value="Indian">Indian</option>
                <option value="Chinese">Chinese</option>
                <option value="Italian">Italian</option>
                <option value="Fast Food">Fast Food</option>
                <option value="Bakery">Bakery</option>
              </select>
            </div>

            <div class="pt-4 flex gap-3">
              <button (click)="showAddModal.set(false)" class="flex-1 py-3 rounded-xl border border-slate-200 dark:border-white/10 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">Cancel</button>
              <button (click)="addHotel()" class="flex-1 btn-primary">Add Partner</button>
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
  showAddModal = signal(false);
  
  newHotel = {
    name: '',
    category: 'Indian'
  };

  addHotel() {
    if (!this.newHotel.name) {
      this.toast.error('Please enter a restaurant name');
      return;
    }
    
    this.catalog.addMerchant({
      name: this.newHotel.name,
      category: this.newHotel.category
    });
    
    this.toast.success(`${this.newHotel.name} added successfully`);
    this.newHotel = { name: '', category: 'Indian' };
    this.showAddModal.set(false);
  }

  editHotel(hotel: Merchant) {
    this.toast.info(`Editing ${hotel.name} functionality coming soon`);
  }

  deleteHotel(hotel: Merchant) {
    if (confirm(`Are you sure you want to remove ${hotel.name}?`)) {
      this.toast.success(`${hotel.name} has been removed`);
    }
  }
}
