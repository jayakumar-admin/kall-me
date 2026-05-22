import { ChangeDetectionStrategy, Component, inject, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CatalogService } from '../../../services/catalog.service';
import { ToastService } from '../../../services/toast.service';
import { ImageUploadService } from '../../../services/image-upload.service';
import { ApiService } from '../../../services/api.service';
import { SearchService } from '../../../services/search.service';
import { Hotel } from '../../../models';

interface ParsedHotelCSV {
  name: string;
  address: string;
  phone: string;
  image_url: string;
  status: string;
}

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
        <div class="flex items-center gap-3">
          <button (click)="toggleBulkUpload()" class="btn-primary !bg-slate-100 hover:!bg-slate-200 !text-slate-700 dark:!bg-white/10 dark:hover:!bg-white/20 dark:!text-white flex items-center gap-2">
            <mat-icon>{{ showBulkUpload() ? 'expand_less' : 'cloud_upload' }}</mat-icon>
            {{ showBulkUpload() ? 'Hide Bulk Upload' : 'Bulk Upload' }}
          </button>
          <button (click)="openAddModal()" class="btn-primary flex items-center gap-2">
            <mat-icon>add_business</mat-icon>
            Add New Hotel
          </button>
        </div>
      </div>

      <!-- Bulk Upload Section -->
      @if (showBulkUpload()) {
        <div class="card space-y-6 border-none ring-1 ring-slate-100 dark:ring-white/5 bg-white dark:bg-[#1E293B] p-6 animate-in slide-in-from-top duration-300">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-4">
            <div class="flex items-center gap-2">
              <mat-icon class="text-[#FFC107]">cloud_upload</mat-icon>
              <div>
                <h3 class="font-bold text-[#1A1A1A] dark:text-white">Bulk Hotel Import</h3>
                <p class="text-[10px] text-slate-400">Upload a CSV file to import multiple hotels at once</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <button (click)="downloadSample()" class="flex items-center gap-1.5 text-xs text-[#FFC107] hover:text-[#FFA000] font-bold transition-all">
                <mat-icon class="text-sm">download</mat-icon>
                Download Sample CSV
              </button>
              <button (click)="toggleBulkUpload()" class="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <mat-icon class="text-sm">close</mat-icon>
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div class="space-y-4">
              <div class="relative flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-white/10 rounded-xl p-8 hover:bg-[#FFC107]/5 dark:hover:bg-white/10 transition-colors">
                <mat-icon class="text-slate-300 mb-2 text-3xl">upload_file</mat-icon>
                <span class="text-xs text-slate-500 font-medium text-center truncate max-w-full mb-1">
                  {{ hotelFileName() || 'Drag & Drop your CSV file here or click to select' }}
                </span>
                <p class="text-[10px] text-slate-400">Only .csv files are supported</p>
                <input type="file" (change)="onHotelFileSelected($event)" accept=".csv" class="absolute inset-0 opacity-0 cursor-pointer">
              </div>

              <div class="flex gap-2.5">
                <button [disabled]="!hotelPreview().length" (click)="submitHotelsBulk()" class="btn-primary w-full py-2 text-xs justify-center items-center flex gap-1.5 shadow-sm">
                  <mat-icon class="text-sm">check_circle</mat-icon> Submit ({{ hotelPreview().length }} Hotels)
                </button>
                <button *ngIf="hotelPreview().length" (click)="clearHotelFile()" class="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-500 rounded-xl transition-all">
                  <mat-icon class="text-sm">close</mat-icon>
                </button>
              </div>
            </div>

            <!-- Preview Card -->
            @if (hotelPreview().length) {
              <div class="space-y-3 bg-[#FFC107]/5 dark:bg-white/5 p-4 rounded-xl border border-[#FFC107]/10 h-full">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-[#FFC107] uppercase tracking-wider font-display">CSV Preview</span>
                  <span class="text-[10px] text-slate-400 font-mono">{{ hotelPreview().length }} hotels prepared</span>
                </div>
                <div class="max-h-48 overflow-y-auto border border-dashed border-slate-200 dark:border-white/10 rounded-xl custom-scrollbar text-xs bg-white dark:bg-[#1E293B]">
                  <table class="w-full text-left border-collapse">
                    <thead>
                      <tr class="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5 font-bold">
                        <th class="px-3 py-2 text-slate-500">Name</th>
                        <th class="px-3 py-2 text-slate-500">Address</th>
                        <th class="px-3 py-2 text-slate-500">Phone</th>
                        <th class="px-3 py-2 text-slate-500">Status</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-white/5">
                      @for (h of hotelPreview(); track $index) {
                        <tr class="hover:bg-slate-50 dark:hover:bg-white/5">
                          <td class="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">{{ h.name }}</td>
                          <td class="px-3 py-2 text-slate-500 truncate max-w-[120px]" [title]="h.address">{{ h.address }}</td>
                          <td class="px-3 py-2 text-slate-500">{{ h.phone }}</td>
                          <td class="px-3 py-2">
                            <span class="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 font-semibold">
                              {{ h.status || 'active' }}
                            </span>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            }
          </div>
        </div>
      }

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

      <!-- Pagination -->
      <div class="card p-4 sm:p-6 border-none ring-1 ring-slate-100 dark:ring-white/5 bg-white dark:bg-[#1E293B] flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in-50 duration-300">
        <div class="flex flex-wrap items-center gap-4">
          <p class="text-xs text-slate-500">
            {{ paginationMessage() }}
          </p>
          <div class="flex items-center gap-2 border-l border-slate-150 dark:border-white/10 pl-4">
            <span class="text-xs text-slate-500">Page size:</span>
            <div class="relative">
              <select
                [ngModel]="pageSize()"
                (ngModelChange)="setPageSize($event)"
                class="appearance-none pl-3 pr-8 py-1 rounded bg-slate-50 dark:bg-[#1E293B] border border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-400 font-bold text-xs outline-none cursor-pointer focus:ring-1 focus:ring-[#FFC107]/20"
              >
                <option [value]="3">3</option>
                <option [value]="6">6</option>
                <option [value]="12">12</option>
                <option [value]="24">24</option>
              </select>
              <mat-icon
                class="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs w-4 h-4 flex items-center justify-center block"
                >expand_more</mat-icon
              >
            </div>
          </div>
        </div>
        <div class="flex items-center gap-1.5 flex-wrap justify-center">
          <button
            [disabled]="currentPageClamped() === 1"
            (click)="prevPage()"
            class="p-2 min-h-9 px-3 rounded-lg bg-slate-50 dark:bg-[#1E293B] border border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-400 font-bold text-xs hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-50 disabled:pointer-events-none transition-colors"
          >
            Previous
          </button>
          @for (page of pageNumbers(); track page) {
            <button
              (click)="setPage(page)"
              [class]="page === currentPageClamped() 
                ? 'w-9 h-9 rounded-lg bg-[#FFC107] text-black font-black text-xs shadow-md shadow-[#FFC107]/20 transition-all font-mono' 
                : 'w-9 h-9 rounded-lg bg-slate-50 dark:bg-[#1E293B] border border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-400 font-bold text-xs hover:bg-slate-100 dark:hover:bg-white/10 transition-all font-mono'"
            >
              {{ page }}
            </button>
          }
          <button
            [disabled]="currentPageClamped() === totalPages()"
            (click)="nextPage()"
            class="p-2 min-h-9 px-3 rounded-lg bg-slate-50 dark:bg-[#1E293B] border border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-400 font-bold text-xs hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-50 disabled:pointer-events-none transition-colors"
          >
            Next
          </button>
        </div>
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
  apiService = inject(ApiService);
  search = inject(SearchService);
  
  pageSize = signal<number>(6);
  currentPage = signal<number>(1);

  filteredHotels = computed(() => {
    const term = this.search.searchTerm().toLowerCase();
    return this.catalog.hotels().filter(h => {
      return (h.name?.toLowerCase().includes(term) || false) || 
             (h.category?.toLowerCase().includes(term) || false) ||
             (h.address?.toLowerCase().includes(term) || false);
    });
  });

  totalPages = computed(() => {
    return Math.ceil(this.filteredHotels().length / this.pageSize()) || 1;
  });

  currentPageClamped = computed(() => {
    const page = this.currentPage();
    const total = this.totalPages();
    if (page < 1) return 1;
    if (page > total) return total;
    return page;
  });

  paginatedHotels = computed(() => {
    const all = this.filteredHotels();
    const size = this.pageSize();
    const page = this.currentPageClamped();
    const start = (page - 1) * size;
    return all.slice(start, start + size);
  });

  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPageClamped();
    const pages: number[] = [];
    
    let start = Math.max(1, current - 2);
    const end = Math.min(total, start + 4);
    
    if (end - start < 4) {
      start = Math.max(1, end - 4);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  });

  paginationMessage = computed(() => {
    const total = this.filteredHotels().length;
    if (total === 0) return 'Showing 0 to 0 of 0 hotels';
    const size = this.pageSize();
    const page = this.currentPageClamped();
    const start = (page - 1) * size + 1;
    const end = Math.min(page * size, total);
    return `Showing ${start} to ${end} of ${total} hotels`;
  });

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  nextPage() {
    this.setPage(this.currentPageClamped() + 1);
  }

  prevPage() {
    this.setPage(this.currentPageClamped() - 1);
  }

  setPageSize(size: string | number) {
    this.pageSize.set(Number(size));
    this.currentPage.set(1);
  }

  hotels = computed(() => this.paginatedHotels());
  
  isModalOpen = signal(false);
  editingHotel = signal<Hotel | null>(null);
  isUploading = signal(false);

  showBulkUpload = signal(false);
  hotelFileName = signal<string>('');
  hotelPreview = signal<ParsedHotelCSV[]>([]);

  toggleBulkUpload() {
    this.showBulkUpload.update(v => !v);
  }
  
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

  // Bulk Upload Functions
  parseCSV(text: string): string[][] {
    const lines = text.split(/\r?\n/);
    return lines
      .map(line => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (const char of line) {
          if (char === '"' || char === "'") {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      })
      .filter(row => row.some(cell => cell !== '')); // Skip empty rows
  }

  onHotelFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.hotelFileName.set(file.name);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        try {
          const rows = this.parseCSV(text);
          if (rows.length < 2) {
            this.toast.error('CSV file is empty or invalid.');
            return;
          }
          const headers = rows[0].map(h => h.toLowerCase().trim());
          const nameIdx = headers.indexOf('hotel_name');
          const addressIdx = headers.indexOf('address');
          const phoneIdx = headers.indexOf('phone');
          const imageIdx = headers.indexOf('image_url');
          const statusIdx = headers.indexOf('status');

          if (nameIdx === -1) {
            this.toast.error('Required header "hotel_name" not found.');
            return;
          }

          const parsed: ParsedHotelCSV[] = rows.slice(1).map(row => {
            return {
              name: row[nameIdx] || '',
              address: addressIdx !== -1 ? row[addressIdx] : '',
              phone: phoneIdx !== -1 ? row[phoneIdx] : '',
              image_url: imageIdx !== -1 ? row[imageIdx] : '',
              status: statusIdx !== -1 ? row[statusIdx] : 'active'
            };
          }).filter(h => h.name);

          this.hotelPreview.set(parsed);
          this.toast.success(`Successfully parsed ${parsed.length} hotels. Review preview below!`);
        } catch {
          this.toast.error('Failed to parse Hotels CSV.');
        }
      };
      reader.readAsText(file);
    }
  }

  submitHotelsBulk() {
    const payload = this.hotelPreview();
    if (!payload.length) return;
    
    this.apiService.bulkUploadHotels(payload as unknown as Record<string, unknown>[]).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success(`Successfully imported ${res.count} hotels!`);
          this.clearHotelFile();
          // Reload the full catalog so the frontend sees all new businesses instantly
          this.catalog.loadInitialData();
          this.showBulkUpload.set(false);
        } else {
          this.toast.error('Failed to import hotels');
        }
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Error occurred during Hotels bulk upload');
      }
    });
  }

  clearHotelFile() {
    this.hotelFileName.set('');
    this.hotelPreview.set([]);
  }

  downloadSample() {
    const hotelCsv = 'hotel_name,address,phone,image_url,status\nSpice Garden,123 Curry Lane,9876543210,https://picsum.photos/seed/spice/400/300,active\nPizza Palace,456 Dough St,9876543211,https://picsum.photos/seed/pizza/400/300,active';
    const blob = new Blob([hotelCsv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_hotels.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  deleteHotel(hotel: Hotel) {
    if (confirm(`Are you sure you want to delete ${hotel.name}?`)) {
      this.catalog.deleteHotel(hotel.id);
    }
  }
}
