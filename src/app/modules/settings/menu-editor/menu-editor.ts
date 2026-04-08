import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CatalogService } from '../../../services/catalog.service';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../services/toast.service';
import { ImageUploadService } from '../../../services/image-upload.service';
import { MenuItem } from '../../../data/static-data';

@Component({
  selector: 'app-menu-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="h-full overflow-y-auto p-6 custom-scrollbar space-y-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-display font-black text-[#1A1A1A] dark:text-white uppercase tracking-tight">Menu Editor</h1>
          <p class="text-slate-500 dark:text-slate-400">Edit or delete items from the global catalog.</p>
        </div>
        <button (click)="openModal()" class="btn-primary flex items-center gap-2">
          <mat-icon>add</mat-icon>
          Add New Item
        </button>
      </div>

      <div class="card border-none ring-1 ring-slate-100 dark:ring-white/5">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                <th class="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Image</th>
                <th class="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Item Name</th>
                <th class="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category</th>
                <th class="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-32">Price (₹)</th>
                <th class="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-24">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-white/5">
              @for (item of catalog.globalMenu(); track item.id) {
                <tr class="group hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <td class="px-4 py-3">
                    <img [src]="item.image_url || 'https://picsum.photos/seed/' + item.name + '/100/100'" 
                         class="w-10 h-10 rounded-lg object-cover border border-slate-100 dark:border-white/5" 
                         alt="item image">
                  </td>
                  <td class="px-4 py-3 text-sm font-bold text-[#1A1A1A] dark:text-white">{{ item.name }}</td>
                  <td class="px-4 py-3 text-xs text-slate-500">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                          [class.bg-emerald-100]="item.category === 'Veg'"
                          [class.text-emerald-600]="item.category === 'Veg'"
                          [class.bg-red-100]="item.category === 'Non-Veg'"
                          [class.text-red-600]="item.category === 'Non-Veg'"
                          [class.bg-slate-100]="item.category !== 'Veg' && item.category !== 'Non-Veg'"
                          [class.text-slate-600]="item.category !== 'Veg' && item.category !== 'Non-Veg'">
                      {{ item.category }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-sm font-mono text-slate-600 dark:text-slate-300">₹{{ item.price }}</td>
                  <td class="px-4 py-3">
                    <button (click)="openModal(item)" class="text-slate-400 hover:text-[#FFC107] mr-2">
                      <mat-icon class="text-sm">edit</mat-icon>
                    </button>
                    <button (click)="deleteItem(item.id)" class="text-slate-400 hover:text-red-500">
                      <mat-icon class="text-sm">delete</mat-icon>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    @if (showModal()) {
      <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div class="bg-white dark:bg-[#0F172A] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 dark:border-white/5">
          <div class="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
            <h3 class="text-xl font-display font-bold text-[#1A1A1A] dark:text-white">
              {{ editingItemId() ? 'Edit Menu Item' : 'Add New Menu Item' }}
            </h3>
            <button (click)="closeModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <form [formGroup]="itemForm" (ngSubmit)="saveItem()" class="p-6 space-y-4">
            <div>
              <label for="item-name" class="text-xs font-bold text-slate-500 mb-1.5 block">Item Name</label>
              <input id="item-name" type="text" formControlName="name" class="input-field" placeholder="e.g. Paneer Tikka">
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="item-category" class="text-xs font-bold text-slate-500 mb-1.5 block">Category</label>
                <select id="item-category" formControlName="category" class="input-field appearance-none">
                  <option value="Veg">Veg</option>
                  <option value="Non-Veg">Non-Veg</option>
                  <option value="Beverage">Beverage</option>
                  <option value="Dessert">Dessert</option>
                  <option value="Others">Others</option>
                </select>
              </div>
              <div>
                <label for="item-price" class="text-xs font-bold text-slate-500 mb-1.5 block">Price (₹)</label>
                <input id="item-price" type="number" formControlName="price" class="input-field" placeholder="0.00">
              </div>
            </div>

            <div>
              <label for="item-image" class="text-xs font-bold text-slate-500 mb-1.5 block">Item Image</label>
              <div class="flex items-center gap-4">
                <div class="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 shrink-0 relative group">
                  <img [src]="itemForm.get('image_url')?.value || 'https://picsum.photos/seed/food/100/100'" 
                       class="w-full h-full object-cover" 
                       alt="Item preview">
                  @if (isUploading()) {
                    <div class="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <mat-icon class="text-white animate-spin text-sm">refresh</mat-icon>
                    </div>
                  }
                </div>
                <div class="flex-1">
                  <input id="item-image" type="file" (change)="onFileSelected($event)" accept="image/*" class="hidden" #fileInput>
                  <button type="button" (click)="fileInput.click()" class="text-xs font-bold text-[#FFC107] hover:text-[#E6AE06] transition-colors">
                    {{ isUploading() ? 'Uploading...' : 'Change Image' }}
                  </button>
                </div>
              </div>
            </div>

            <div class="pt-4 flex gap-3">
              <button type="button" (click)="closeModal()" class="flex-1 py-3 rounded-xl border border-slate-200 dark:border-white/10 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">Cancel</button>
              <button type="submit" [disabled]="itemForm.invalid || isUploading()" class="flex-1 btn-primary disabled:opacity-50">
                {{ editingItemId() ? 'Update Item' : 'Add Item' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MenuEditor {
  catalog = inject(CatalogService);
  api = inject(ApiService);
  toast = inject(ToastService);
  fb = inject(FormBuilder);
  imageUpload = inject(ImageUploadService);

  showModal = signal(false);
  editingItemId = signal<number | null>(null);
  isUploading = signal(false);

  itemForm = this.fb.group({
    name: ['', [Validators.required]],
    category: ['Veg', [Validators.required]],
    price: [0, [Validators.required, Validators.min(0)]],
    image_url: ['']
  });

  openModal(item?: MenuItem) {
    if (item) {
      this.editingItemId.set(item.id);
      this.itemForm.patchValue({
        name: item.name,
        category: item.category,
        price: item.price,
        image_url: item.image_url || ''
      });
    } else {
      this.editingItemId.set(null);
      this.itemForm.reset({
        name: '',
        category: 'Veg',
        price: 0,
        image_url: ''
      });
    }
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.editingItemId.set(null);
    this.itemForm.reset();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.isUploading.set(true);
      this.imageUpload.uploadImage(file).subscribe({
        next: (url) => {
          if (url) {
            this.itemForm.patchValue({ image_url: url });
            this.toast.success('Image uploaded successfully');
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

  saveItem() {
    if (this.itemForm.invalid) return;

    const itemData = this.itemForm.value as Partial<MenuItem>;
    const id = this.editingItemId();

    if (id) {
      this.api.updateMenuItem(id, itemData).subscribe({
        next: () => {
          this.toast.success('Item updated successfully');
          this.catalog.loadInitialData();
          this.closeModal();
        },
        error: () => this.toast.error('Failed to update item')
      });
    } else {
      this.api.createMenuItem(itemData).subscribe({
        next: () => {
          this.toast.success('Item added successfully');
          this.catalog.loadInitialData();
          this.closeModal();
        },
        error: () => this.toast.error('Failed to add item')
      });
    }
  }

  deleteItem(id: number) {
    if (confirm('Are you sure you want to delete this item?')) {
      this.api.deleteMenuItem(id).subscribe({
        next: () => {
          this.toast.success('Item deleted successfully');
          this.catalog.loadInitialData();
        },
        error: () => this.toast.error('Failed to delete item')
      });
    }
  }
}
