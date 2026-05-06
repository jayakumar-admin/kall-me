import { ChangeDetectionStrategy, Component, inject, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CatalogService } from '../../../services/catalog.service';
import { ToastService } from '../../../services/toast.service';
import { ImageUploadService } from '../../../services/image-upload.service';
import { Hotel } from '../../../models';

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
              <img [src]="hotel.image_url" [alt]="hotel.name" class="w-full h-full object-cover">
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

              <div class="mt-auto pt-4 flex items-center justify-end border-t border-slate-100 dark:border-white/5">
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
          <div class="bg-white dark:bg-[#1E293B] rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div class="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0">
              <h2 class="text-xl font-bold text-[#1A1A1A] dark:text-white">
                {{ editingHotel() ? 'Edit Hotel' : 'Add New Hotel' }}
              </h2>
              <button (click)="closeModal()" class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            
            <div class="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              <div>
                <label for="hotelName" class="text-xs font-bold text-slate-500 mb-2 block">Hotel Name</label>
                <input id="hotelName" type="text" [(ngModel)]="formData.name" class="input-field py-2 text-sm" placeholder="e.g. Spice Route">
              </div>
              
              <div class="grid grid-cols-1 gap-4">
                <div>
                  <label for="hotelCategory" class="text-xs font-bold text-slate-500 mb-2 block">Category</label>
                  <input id="hotelCategory" type="text" [(ngModel)]="formData.category" class="input-field py-2 text-sm" placeholder="e.g. North Indian">
                </div>
              </div>
              
              <div>
                <label for="hotelAddress" class="text-xs font-bold text-slate-500 mb-2 block">Address</label>
                <textarea id="hotelAddress" [(ngModel)]="formData.address" class="input-field py-2 text-sm resize-none h-20" placeholder="Full address..."></textarea>
              </div>
              
              <div>
                <label for="imagesInput" class="text-xs font-bold text-slate-500 mb-2 block">Hotel Image</label>
                <div class="border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl p-4 text-center hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer relative">
                  <input id="imagesInput" type="file" accept="image/*" (change)="onFileSelected($event)" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" [disabled]="isUploading()">
                  @if (isUploading()) {
                    <mat-icon class="text-[#FFC107] mb-2 animate-spin">refresh</mat-icon>
                    <p class="text-xs text-slate-500 font-medium">Uploading image...</p>
                  } @else {
                    <mat-icon class="text-slate-400 mb-2">cloud_upload</mat-icon>
                    <p class="text-xs text-slate-500 font-medium">Click or drag image to upload</p>
                  }
                </div>
                
                @if (formData.image_url) {
                  <div class="mt-3">
                    <div class="relative w-24 h-24 rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 group">
                      <img [src]="formData.image_url" alt="Hotel image preview" class="w-full h-full object-cover">
                      <button (click)="removeImage()" class="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <mat-icon class="text-[12px] w-3 h-3 flex items-center justify-center">close</mat-icon>
                      </button>
                    </div>
                  </div>
                }
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
              <button (click)="saveHotel()" [disabled]="isUploading()" class="btn-primary py-2 text-sm disabled:opacity-50">
                {{ isUploading() ? 'Uploading...' : 'Save Hotel' }}
              </button>
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
  imageUpload = inject(ImageUploadService);
  cdr = inject(ChangeDetectorRef);
  
  hotels = computed(() => this.catalog.hotels());
  
  isModalOpen = signal(false);
  editingHotel = signal<Hotel | null>(null);
  isUploading = signal(false);
  
  formData = {
    name: '',
    category: '',
    address: '',
    status: 'active' as 'active' | 'inactive',
    image_url: 'https://picsum.photos/seed/hotel/400/300'
  };

  openAddModal() {
    this.editingHotel.set(null);
    this.resetForm();
    this.isModalOpen.set(true);
  }

  editHotel(hotel: Hotel) {
    this.editingHotel.set(hotel);
    this.formData = { 
      name: hotel.name,
      category: hotel.category,
      address: hotel.address || '',
      status: hotel.status || 'active',
      image_url: hotel.image_url || 'https://picsum.photos/seed/hotel/400/300'
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
      address: '',
      status: 'active',
      image_url: 'https://picsum.photos/seed/hotel/400/300'
    };
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.isUploading.set(true);
      this.imageUpload.uploadImage(file).subscribe({
        next: (url) => {
          if (url) {
            this.formData.image_url = url;
            this.toast.success('Image uploaded successfully');
            this.cdr.markForCheck();
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

  removeImage() {
    this.formData.image_url = 'https://picsum.photos/seed/hotel/400/300';
    this.cdr.markForCheck();
  }

  saveHotel() {
    if (!this.formData.name || !this.formData.category) {
      this.toast.error('Please fill in all required fields');
      return;
    }

    const hotelData = {
      ...this.formData,
      rating: this.editingHotel()?.rating || 4.5,
      reviews: this.editingHotel()?.reviews || 0
    };
    
    if (this.editingHotel()) {
      this.catalog.updateHotel(this.editingHotel()!.id, hotelData as Partial<Hotel>).subscribe({
        next: (updated) => {
          this.catalog.hotels.update(current => current.map(m => m.id === updated.id ? updated : m));
          this.toast.success(`${updated.name} updated successfully`);
          this.closeModal();
        },
        error: () => this.toast.error('Failed to update hotel')
      });
    } else {
      this.catalog.addHotel(hotelData as Partial<Hotel>).subscribe({
        next: (newHotel) => {
          this.catalog.hotels.update(current => [...current, newHotel]);
          this.toast.success(`${newHotel.name} added successfully`);
          this.closeModal();
        },
        error: () => this.toast.error('Failed to add hotel')
      });
    }
  }

  deleteHotel(hotel: Hotel) {
    if (confirm(`Are you sure you want to delete ${hotel.name}?`)) {
      this.catalog.deleteHotel(hotel.id);
    }
  }
}
