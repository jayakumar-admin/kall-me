import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { DeliveryPerson } from '../../models';

@Component({
  selector: 'app-delivery-list',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="space-y-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-display font-bold text-slate-900 dark:text-white">Delivery Team</h1>
          <p class="text-slate-500 dark:text-slate-400">Manage your fleet of delivery partners.</p>
        </div>
        <button (click)="addDriver()" class="btn-primary flex items-center gap-2">
          <mat-icon>add</mat-icon>
          Add Driver
        </button>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="card flex items-center justify-between">
          <div>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Drivers</p>
            <p class="text-2xl font-bold text-slate-900 dark:text-white">128</p>
            <p class="text-[10px] text-green-500 font-bold mt-1">↑ +12% from last month</p>
          </div>
          <div class="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
            <mat-icon>groups</mat-icon>
          </div>
        </div>
        <div class="card flex items-center justify-between">
          <div>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Now</p>
            <p class="text-2xl font-bold text-green-500">45</p>
            <p class="text-[10px] text-slate-400 font-medium mt-1">Live updates active</p>
          </div>
          <div class="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-500">
            <mat-icon>sensors</mat-icon>
          </div>
        </div>
        <div class="card flex items-center justify-between">
          <div>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">On Delivery</p>
            <p class="text-2xl font-bold text-amber-500">32</p>
            <p class="text-[10px] text-slate-400 font-medium mt-1">↘ -2% from yesterday</p>
          </div>
          <div class="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-500">
            <mat-icon>inventory_2</mat-icon>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="card !p-0 overflow-hidden">
        <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div class="relative w-96">
            <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</mat-icon>
            <input type="text" placeholder="Search driver name or ID..." class="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl pl-10 pr-4 py-2 text-sm outline-none">
          </div>
          <button class="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            <mat-icon>filter_list</mat-icon>
          </button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-800/50">
                <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Driver Name</th>
                <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mobile Number</th>
                <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              @for (driver of drivers(); track driver.id) {
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                        <img [src]="'https://api.dicebear.com/7.x/avataaars/svg?seed=' + driver.name" alt="">
                      </div>
                      <div>
                        <p class="text-sm font-bold text-slate-900 dark:text-white">{{ driver.name }}</p>
                        <p class="text-[10px] text-slate-400 uppercase">Emp ID: #KM-00{{ driver.id }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 font-medium">{{ driver.mobile }}</td>
                  <td class="px-6 py-4">
                    <span 
                      [class]="getStatusClass(driver.status)"
                      class="px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                    >
                      {{ driver.status }}
                    </span>
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex items-center justify-center gap-2">
                      <button (click)="editDriver(driver)" class="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition-colors">
                        <mat-icon class="text-lg">edit</mat-icon>
                      </button>
                      <button (click)="blockDriver(driver)" class="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 transition-colors">
                        <mat-icon class="text-lg">block</mat-icon>
                      </button>
                    </div>
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
export class DeliveryList implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  drivers = signal<DeliveryPerson[]>([]);

  ngOnInit() {
    this.api.getDeliveryTeam().subscribe(d => this.drivers.set(d));
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
      case 'busy': return 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400';
      case 'offline': return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
      default: return 'bg-slate-100 text-slate-600';
    }
  }

  addDriver() {
    this.toast.info('Add driver functionality coming soon');
  }

  editDriver(driver: DeliveryPerson) {
    this.toast.info(`Editing driver: ${driver.name}`);
  }

  blockDriver(driver: DeliveryPerson) {
    if (confirm(`Are you sure you want to block ${driver.name}?`)) {
      this.toast.success(`Driver ${driver.name} has been blocked`);
    }
  }
}
