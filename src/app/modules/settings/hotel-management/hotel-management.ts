import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CatalogService } from '../../../services/catalog.service';
import { ToastService } from '../../../services/toast.service';
import { Merchant } from '../../../data/static-data';

@Component({
  selector: 'app-hotel-management',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="h-full overflow-y-auto p-6 custom-scrollbar space-y-8">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-display font-black text-[#1A1A1A] dark:text-white uppercase tracking-tight">Hotel Management</h1>
          <p class="text-slate-500 dark:text-slate-400">Manage restaurant partners and their details.</p>
        </div>
        <button (click)="openAddModal()" class="btn-primary flex items-center gap-2">
          <mat-icon>add_business</mat-icon>
          Add New Hotel
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        @for (hotel of hotels(); track hotel.id) {
          <div class="card p-0 overflow-hidden flex flex-col group border-none ring-1 ring-slate-100 dark:ring-white/5">
            <div class="h-32 bg-slate-100 dark:bg-white/5 relative">
              <img [src]="hotel.image" [alt]="hotel.name" class="w-full h-full object-cover">
              <div class="absolute top-3 right-3 flex gap-2">
                <span class="bg-white/90 dark:bg-black/50 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest flex items-center gap-1"
                  [ngClass]="(hotel.status || 'active') === 'active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'">
                  <span class="w-1.5 h-1.5 rounded-full" [ngClass]="(hotel.status || 'active') === 'active' ? 'bg-emerald-500' : 'bg-slate-400'"></span>
                  {{ hotel.status || 'active' }}
                </span>
              </div>
            </div>
            
            <div class="p-5 flex-1 flex flex-col">
              <div class="flex justify-between items-start mb-2">
                <div>
                  <h3 class="font-bold text-lg text-[#1A1A1A] dark:text-white">{{ hotel.name }}</h3>
                  <p class="text-xs text-slate-500 dark:text-slate-400">{{ hotel.category }}</p>
                </div>
                <div class="flex items-center gap-1 bg-[#FFC107]/10 px-2 py-1 rounded-md text-[#FFC107] font-bold text-xs">
                  <mat-icon class="text-sm">star</mat-icon>
                  {{ hotel.rating }}
                </div>
              </div>
              
              <div class="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400 mt-2">
                <mat-icon class="text-sm shrink-0 mt-0.5">location_on</mat-icon>
                <p class="line-clamp-2">{{ hotel.address || 'Address not set' }}</p>
              </div>

              <div class="mt-auto pt-4 flex items-center justify-between border-t border-slate-100 dark:border-white/5">
                <div class="text-xs">
                  <span class="text-slate-500 dark:text-slate-400">Commission: </span>
                  <span class="font-bold text-[#1A1A1A] dark:text-white">{{ hotel.commission_rate || 15 }}%</span>
                </div>
                <div class="flex gap-2">
                  <button (click)="editHotel(hotel)" class="p-1.5 text-slate-400 hover:text-[#FFC107] hover:bg-[#FFC107]/10 rounded-lg transition-colors">
                    <mat-icon class="text-sm">edit</mat-icon>
                  </button>
                  <button (click)="deleteHotel(hotel)" class="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                    <mat-icon class="text-sm">delete</mat-icon>
                  </button>
                </div>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Add/Edit Modal -->
      @if (isModalOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div class="bg-white dark:bg-[#1E293B] rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div class="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
              <h2 class="text-xl font-bold text-[#1A1A1A] dark:text-white">
                {{ editingHotel() ? 'Edit Hotel' : 'Add New Hotel' }}
              </h2>
              <button (click)="closeModal()" class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            
            <div class="p-6 space-y-4">
              <div>
                <label for="hotelName" class="text-xs font-bold text-slate-500 mb-2 block">Hotel Name</label>
                <input id="hotelName" type="text" [(ngModel)]="formData.name" class="input-field py-2 text-sm" placeholder="e.g. Spice Route">
              </div>
              
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="hotelCategory" class="text-xs font-bold text-slate-500 mb-2 block">Category</label>
                  <input id="hotelCategory" type="text" [(ngModel)]="formData.category" class="input-field py-2 text-sm" placeholder="e.g. North Indian">
                </div>
                <div>
                  <label for="hotelCommission" class="text-xs font-bold text-slate-500 mb-2 block">Commission (%)</label>
                  <input id="hotelCommission" type="number" [(ngModel)]="formData.commission_rate" class="input-field py-2 text-sm" placeholder="15">
                </div>
              </div>
              
              <div>
                <label for="hotelAddress" class="text-xs font-bold text-slate-500 mb-2 block">Address</label>
                <textarea id="hotelAddress" [(ngModel)]="formData.address" class="input-field py-2 text-sm resize-none h-20" placeholder="Full address..."></textarea>
              </div>
              
              <div>
                <label for="hotelStatus" class="text-xs font-bold text-slate-500 mb-2 block">Status</label>
                <select id="hotelStatus" [(ngModel)]="formData.status" class="input-field py-2 text-sm appearance-none cursor-pointer">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            
            <div class="p-6 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 flex justify-end gap-3">
              <button (click)="closeModal()" class="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">Cancel</button>
              <button (click)="saveHotel()" class="btn-primary py-2 text-sm">Save Hotel</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HotelManagement {
  catalog = inject(CatalogService);
  toast = inject(ToastService);
  
  hotels = computed(() => this.catalog.merchants());
  
  isModalOpen = signal(false);
  editingHotel = signal<Merchant | null>(null);
  
  formData = {
    name: '',
    category: '',
    commission_rate: 15,
    address: '',
    status: 'active' as 'active' | 'inactive',
    image: 'https://picsum.photos/seed/hotel/400/300'
  };

  openAddModal() {
    this.editingHotel.set(null);
    this.resetForm();
    this.isModalOpen.set(true);
  }

  editHotel(hotel: Merchant) {
    this.editingHotel.set(hotel);
    this.formData = { 
      name: hotel.name,
      category: hotel.category,
      commission_rate: hotel.commission_rate || 15,
      address: hotel.address || '',
      status: hotel.status || 'active',
      image: hotel.image
    };
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.resetForm();
  }

  resetForm() {
    this.formData = {
      name: '',
      category: '',
      commission_rate: 15,
      address: '',
      status: 'active',
      image: 'https://picsum.photos/seed/hotel/400/300'
    };
  }

  saveHotel() {
    if (!this.formData.name || !this.formData.category) {
      this.toast.error('Please fill in all required fields');
      return;
    }

    // In a real app, we would call an API service here.
    // For now, we'll simulate saving and show a toast.
    
    if (this.editingHotel()) {
      this.toast.success(`Hotel "${this.formData.name}" updated successfully`);
    } else {
      this.toast.success(`New hotel "${this.formData.name}" added successfully`);
    }
    
    this.closeModal();
  }

  deleteHotel(hotel: Merchant) {
    if (confirm(`Are you sure you want to delete ${hotel.name}?`)) {
      // Simulate deletion
      this.toast.success(`Hotel "${hotel.name}" deleted successfully`);
    }
  }
}
