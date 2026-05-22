import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CatalogService } from '../../../services/catalog.service';
import { MenuItem } from '../../../data/static-data';
import { ImageUploadService } from '../../../services/image-upload.service';
import { ToastService } from '../../../services/toast.service';
import { ApiService } from '../../../services/api.service';

interface ParsedMenuCSV {
  hotel_name: string;
  menu_name: string;
  category: string;
  price: number;
  description: string;
  status: string;
}

@Component({
  selector: 'app-menu-bulk-add',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="h-full overflow-y-auto p-6 custom-scrollbar space-y-8">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-display font-black text-[#1A1A1A] dark:text-white uppercase tracking-tight">Bulk Menu Import</h1>
          <p class="text-slate-500 dark:text-slate-400">Add multiple items to the global catalog at once.</p>
        </div>
        <div class="flex items-center gap-3">
          <button (click)="toggleBulkUpload()" class="btn-primary !bg-slate-100 hover:!bg-slate-200 !text-slate-700 dark:!bg-white/10 dark:hover:!bg-white/20 dark:!text-white flex items-center gap-2">
            <mat-icon>{{ showBulkUpload() ? 'expand_less' : 'cloud_upload' }}</mat-icon>
            {{ showBulkUpload() ? 'Hide CSV Upload' : 'Upload Menus CSV' }}
          </button>
          <button (click)="saveItems()" class="btn-primary flex items-center gap-2">
            <mat-icon>save</mat-icon>
            Save to Catalog
          </button>
        </div>
      </div>

      <!-- Bulk CSV Upload Section -->
      @if (showBulkUpload()) {
        <div class="card space-y-6 border-none ring-1 ring-slate-100 dark:ring-white/5 bg-white dark:bg-[#1E293B] p-6 animate-in slide-in-from-top duration-300">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-4">
            <div class="flex items-center gap-2">
              <mat-icon class="text-emerald-500">cloud_upload</mat-icon>
              <div>
                <h3 class="font-bold text-[#1A1A1A] dark:text-white">Import Menus via CSV</h3>
                <p class="text-[10px] text-slate-400">Headers required: hotel_name, menu_name, category, price, description, status</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <button (click)="downloadSample()" class="flex items-center gap-1.5 text-xs text-emerald-500 hover:text-emerald-600 font-bold transition-all">
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
              <div class="relative flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-white/10 rounded-xl p-8 hover:bg-emerald-500/5 dark:hover:bg-white/10 transition-colors">
                <mat-icon class="text-slate-300 mb-2 text-3xl">upload_file</mat-icon>
                <span class="text-xs text-slate-500 font-medium text-center truncate max-w-full mb-1">
                  {{ menuFileName() || 'Drag & Drop your CSV file here or click to select' }}
                </span>
                <p class="text-[10px] text-slate-400">Only .csv files are supported</p>
                <input type="file" (change)="onMenuFileSelected($event)" accept=".csv" class="absolute inset-0 opacity-0 cursor-pointer">
              </div>

              <div class="flex gap-2.5">
                <button [disabled]="!menuPreview().length" (click)="submitMenusBulk()" class="btn-primary w-full py-2 text-xs justify-center items-center flex gap-1.5 bg-emerald-500 hover:bg-emerald-600 focus:ring-emerald-500 border-none">
                  <mat-icon class="text-sm">check_circle</mat-icon> Submit ({{ menuPreview().length }} Menus)
                </button>
                <button *ngIf="menuPreview().length" (click)="clearMenuFile()" class="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-500 rounded-xl transition-all">
                  <mat-icon class="text-sm">close</mat-icon>
                </button>
              </div>
            </div>

            <!-- Preview Card -->
            @if (menuPreview().length) {
              <div class="space-y-3 bg-emerald-500/5 dark:bg-white/5 p-4 rounded-xl border border-emerald-500/10 h-full">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-emerald-500 uppercase tracking-wider font-display">Menus CSV Preview</span>
                  <span class="text-[10px] text-slate-400 font-mono">{{ menuPreview().length }} rows parsed</span>
                </div>
                <div class="max-h-48 overflow-y-auto border border-dashed border-slate-200 dark:border-white/10 rounded-xl custom-scrollbar text-xs bg-white dark:bg-[#1E293B]">
                  <table class="w-full text-left border-collapse">
                    <thead>
                      <tr class="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5 font-bold">
                        <th class="px-3 py-2 text-slate-500">Hotel Name</th>
                        <th class="px-3 py-2 text-slate-500">Menu Name</th>
                        <th class="px-3 py-2 text-slate-500">Category</th>
                        <th class="px-3 py-2 text-slate-500">Price (₹)</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-white/5">
                      @for (m of menuPreview(); track $index) {
                        <tr class="hover:bg-slate-50 dark:hover:bg-white/5">
                          <td class="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">{{ m.hotel_name }}</td>
                          <td class="px-3 py-2 text-slate-700 dark:text-slate-200">{{ m.menu_name }}</td>
                          <td class="px-3 py-2 text-slate-500">{{ m.category }}</td>
                          <td class="px-3 py-2 font-mono font-semibold text-slate-700 dark:text-slate-200">₹{{ m.price }}</td>
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

      <div class="card border-none ring-1 ring-slate-100 dark:ring-white/5">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                <th class="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-12">#</th>
                <th class="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-20">Image</th>
                <th class="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Item Name</th>
                <th class="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category</th>
                <th class="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</th>
                <th class="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-32">Base Price (₹)</th>
                <th class="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-12"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-white/5">
              @for (item of newItems(); track $index) {
                <tr class="group hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <td class="px-4 py-3 text-xs text-slate-400">{{ $index + 1 }}</td>
                  <td class="px-4 py-3">
                    <div class="flex flex-col gap-2">
                      <div class="w-10 h-10 rounded-lg bg-slate-100 dark:bg-white/5 overflow-hidden relative group/img cursor-pointer border border-dashed border-slate-300 dark:border-white/20">
                        @if (item.image_url) {
                          <img [src]="item.image_url" [alt]="item.name || 'Menu item image'" class="w-full h-full object-cover">
                        } @else {
                          <div class="w-full h-full flex items-center justify-center text-slate-300">
                            <mat-icon class="text-xs">add_photo_alternate</mat-icon>
                          </div>
                        }
                        <div class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                          <mat-icon class="text-white text-xs">upload</mat-icon>
                        </div>
                        <input 
                          type="file" 
                          (change)="onFileSelected($event, $index)"
                          accept="image/*"
                          class="absolute inset-0 opacity-0 cursor-pointer"
                        >
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <input 
                      type="text" 
                      [(ngModel)]="item.name" 
                      placeholder="e.g. Butter Chicken"
                      class="w-full bg-transparent border-none outline-none text-sm font-bold text-[#1A1A1A] dark:text-white placeholder:text-slate-300 focus:ring-0"
                    >
                  </td>
                  <td class="px-4 py-3">
                    <select 
                      [(ngModel)]="item.category"
                      class="w-full bg-transparent border-none outline-none text-sm text-slate-600 dark:text-slate-300 focus:ring-0 cursor-pointer"
                    >
                      <option value="Starters">Starters</option>
                      <option value="Main Course">Main Course</option>
                      <option value="Desserts">Desserts</option>
                      <option value="Beverages">Beverages</option>
                    </select>
                  </td>
                  <td class="px-4 py-3">
                    <input 
                      type="text" 
                      [(ngModel)]="item.description" 
                      placeholder="Short description..."
                      class="w-full bg-transparent border-none outline-none text-sm text-slate-500 dark:text-slate-400 placeholder:text-slate-300 focus:ring-0"
                    >
                  </td>
                  <td class="px-4 py-3">
                    <input 
                      type="number" 
                      [(ngModel)]="item.price" 
                      placeholder="0.00"
                      class="w-full bg-transparent border-none outline-none text-sm font-mono font-bold text-[#1A1A1A] dark:text-white placeholder:text-slate-300 focus:ring-0 text-right"
                    >
                  </td>
                  <td class="px-4 py-3 text-center">
                    <button (click)="removeItem($index)" class="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 rounded transition-all">
                      <mat-icon class="text-sm">delete</mat-icon>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        
        <div class="p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
          <button (click)="addNewRow()" class="text-sm font-bold text-[#FFC107] hover:text-[#FFA000] flex items-center gap-2 transition-colors">
            <mat-icon class="text-sm">add</mat-icon>
            Add Another Item
          </button>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MenuBulkAdd {
  catalog = inject(CatalogService);
  imageUpload = inject(ImageUploadService);
  toast = inject(ToastService);
  apiService = inject(ApiService);
  
  newItems = signal<{ name: string; category: MenuItem['category']; description: string; price: number; image_url: string }[]>([
    { name: '', category: 'Main Course', description: '', price: 0, image_url: '' }
  ]);

  showBulkUpload = signal(false);
  menuFileName = signal<string>('');
  menuPreview = signal<ParsedMenuCSV[]>([]);

  toggleBulkUpload() {
    this.showBulkUpload.update(v => !v);
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

  onMenuFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.menuFileName.set(file.name);
      
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
          const hNameIdx = headers.indexOf('hotel_name');
          const mNameIdx = headers.indexOf('menu_name');
          const categoryIdx = headers.indexOf('category');
          const priceIdx = headers.indexOf('price');
          const descIdx = headers.indexOf('description');
          const statusIdx = headers.indexOf('status');

          if (hNameIdx === -1 || mNameIdx === -1 || priceIdx === -1) {
            this.toast.error('Required headers "hotel_name", "menu_name", or "price" not found.');
            return;
          }

          const parsed: ParsedMenuCSV[] = rows.slice(1).map(row => {
            return {
              hotel_name: row[hNameIdx] || '',
              menu_name: row[mNameIdx] || '',
              category: categoryIdx !== -1 ? row[categoryIdx] : 'Main Course',
              price: priceIdx !== -1 ? parseFloat(row[priceIdx]) || 0 : 0,
              description: descIdx !== -1 ? row[descIdx] : '',
              status: statusIdx !== -1 ? row[statusIdx] : 'active'
            };
          }).filter(m => m.hotel_name && m.menu_name);

          this.menuPreview.set(parsed);
          this.toast.success(`Successfully parsed ${parsed.length} menus. Review preview below!`);
        } catch {
          this.toast.error('Failed to parse Menus CSV.');
        }
      };
      reader.readAsText(file);
    }
  }

  submitMenusBulk() {
    const payload = this.menuPreview();
    if (!payload.length) return;
    
    this.apiService.bulkUploadMenus(payload as unknown as Record<string, unknown>[]).subscribe({
      next: (res) => {
        if (res.success) {
          let msg = `Successfully imported ${res.count} menu items!`;
          if (res.skipped && res.skipped.length > 0) {
            msg += ` (Skipped ${res.skipped.length} due to unmapped hotel names)`;
            console.log('Skipped items:', res.skipped);
          }
          this.toast.success(msg);
          this.clearMenuFile();
          // Reload the full catalog so changes apply to local state
          this.catalog.loadInitialData();
          this.showBulkUpload.set(false);
        } else {
          this.toast.error('Failed to import menus');
        }
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Error occurred during Menus bulk upload');
      }
    });
  }

  clearMenuFile() {
    this.menuFileName.set('');
    this.menuPreview.set([]);
  }

  downloadSample() {
    const menuCsv = 'hotel_name,menu_name,category,price,description,status\nSpice Garden,Chicken Biryani,Main Course,120,Spicy biryani,active\nSpice Garden,Parotta,Main Course,20,Soft parotta,active';
    const blob = new Blob([menuCsv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_menus.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  addNewRow() {
    this.newItems.update(items => [...items, { name: '', category: 'Main Course', description: '', price: 0, image_url: '' }]);
  }

  removeItem(index: number) {
    this.newItems.update(items => items.filter((_, i) => i !== index));
  }

  onFileSelected(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.imageUpload.uploadImage(file).subscribe({
        next: (url) => {
          if (url) {
            this.newItems.update(items => {
              const updated = [...items];
              updated[index] = { ...updated[index], image_url: url };
              return updated;
            });
            this.toast.success('Image uploaded successfully');
          } else {
            this.toast.error('Failed to upload image');
          }
        },
        error: () => this.toast.error('Failed to upload image')
      });
    }
  }

  saveItems() {
    const validItems = this.newItems().filter(i => i.name && i.price > 0);
    if (validItems.length === 0) {
      this.toast.error('Please enter at least one valid item with a name and price.');
      return;
    }

    this.catalog.addGlobalItems(validItems);
    
    // Reset form
    this.newItems.set([{ name: '', category: 'Main Course', description: '', price: 0, image_url: '' }]);
    this.toast.success(`Successfully added ${validItems.length} items to the catalog!`);
  }
}
