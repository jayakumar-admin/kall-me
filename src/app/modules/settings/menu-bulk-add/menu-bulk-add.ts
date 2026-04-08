import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CatalogService } from '../../../services/catalog.service';
import { MenuItem } from '../../../data/static-data';
import { ImageUploadService } from '../../../services/image-upload.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-menu-bulk-add',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="h-full overflow-y-auto p-6 custom-scrollbar space-y-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-display font-black text-[#1A1A1A] dark:text-white uppercase tracking-tight">Bulk Menu Import</h1>
          <p class="text-slate-500 dark:text-slate-400">Add multiple items to the global catalog at once.</p>
        </div>
        <button (click)="saveItems()" class="btn-primary flex items-center gap-2">
          <mat-icon>save</mat-icon>
          Save to Catalog
        </button>
      </div>

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
  
  newItems = signal<{ name: string; category: MenuItem['category']; description: string; price: number; image_url: string }[]>([
    { name: '', category: 'Main Course', description: '', price: 0, image_url: '' }
  ]);

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
