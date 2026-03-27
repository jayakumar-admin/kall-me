import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CatalogService } from '../../../services/catalog.service';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../services/toast.service';

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
      </div>

      <div class="card border-none ring-1 ring-slate-100 dark:ring-white/5">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                <th class="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Item Name</th>
                <th class="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category</th>
                <th class="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-32">Price (₹)</th>
                <th class="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-24">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-white/5">
              @for (item of catalog.globalMenu(); track item.id) {
                <tr class="group hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <td class="px-4 py-3 text-sm font-bold text-[#1A1A1A] dark:text-white">{{ item.name }}</td>
                  <td class="px-4 py-3 text-xs text-slate-500">{{ item.category }}</td>
                  <td class="px-4 py-3 text-sm font-mono text-slate-600 dark:text-slate-300">₹{{ item.price }}</td>
                  <td class="px-4 py-3">
                    <button (click)="editItem()" class="text-slate-400 hover:text-[#FFC107] mr-2">
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
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MenuEditor {
  catalog = inject(CatalogService);
  api = inject(ApiService);
  toast = inject(ToastService);
  fb = inject(FormBuilder);

  editItem() {
    this.toast.info('Edit functionality coming soon!');
  }

  deleteItem(id: number) {
    if (confirm('Are you sure you want to delete this item?')) {
      this.api.deleteMenuItem(id).subscribe({
        next: () => {
          this.toast.success('Item deleted successfully');
          this.catalog.loadInitialData(); // Reload data
        },
        error: () => this.toast.error('Failed to delete item')
      });
    }
  }
}
