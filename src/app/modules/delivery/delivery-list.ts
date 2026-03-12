import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { DeliveryPerson } from '../../models';

@Component({
  selector: 'app-delivery-list',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="space-y-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-display font-bold text-slate-900 dark:text-white">Delivery Team</h1>
          <p class="text-slate-500 dark:text-slate-400">Manage your fleet of delivery partners.</p>
        </div>
        <button (click)="openModal()" class="btn-primary flex items-center gap-2">
          <mat-icon>add</mat-icon>
          Add Driver
        </button>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="card flex items-center justify-between">
          <div>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Drivers</p>
            <p class="text-2xl font-bold text-slate-900 dark:text-white">{{ drivers().length }}</p>
            <p class="text-[10px] text-green-500 font-bold mt-1">↑ +12% from last month</p>
          </div>
          <div class="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
            <mat-icon>groups</mat-icon>
          </div>
        </div>
        <div class="card flex items-center justify-between">
          <div>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Now</p>
            <p class="text-2xl font-bold text-green-500">{{ activeCount() }}</p>
            <p class="text-[10px] text-slate-400 font-medium mt-1">Live updates active</p>
          </div>
          <div class="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-500">
            <mat-icon>sensors</mat-icon>
          </div>
        </div>
        <div class="card flex items-center justify-between">
          <div>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Busy</p>
            <p class="text-2xl font-bold text-amber-500">{{ busyCount() }}</p>
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
            <input 
              type="text" 
              placeholder="Search driver name or ID..." 
              class="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl pl-10 pr-4 py-2 text-sm outline-none"
              (input)="onSearch($event)"
            >
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
              @for (driver of filteredDrivers(); track driver.id) {
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                        <img [src]="'https://api.dicebear.com/7.x/avataaars/svg?seed=' + driver.name" alt="">
                      </div>
                      <div>
                        <p class="text-sm font-bold text-slate-900 dark:text-white">{{ driver.name }}</p>
                        <p class="text-[10px] text-slate-400 uppercase">Emp ID: #KM-{{ driver.id }}</p>
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
                      <button (click)="openModal(driver)" class="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition-colors">
                        <mat-icon class="text-lg">edit</mat-icon>
                      </button>
                      <button (click)="deleteDriver(driver)" class="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 transition-colors">
                        <mat-icon class="text-lg">delete</mat-icon>
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

    <!-- Modal -->
    @if (showModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div class="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
          <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 class="text-xl font-bold text-slate-900 dark:text-white">
              {{ editingDriver() ? 'Edit Driver' : 'Add New Driver' }}
            </h2>
            <button (click)="closeModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          
          <form [formGroup]="driverForm" (ngSubmit)="saveDriver()" class="p-6 space-y-4">
            <div>
              <label for="driverName" class="block text-xs font-bold text-slate-400 uppercase mb-2">Full Name</label>
              <input id="driverName" type="text" formControlName="name" class="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ring-indigo-500/20 transition-all">
            </div>
            
            <div>
              <label for="driverMobile" class="block text-xs font-bold text-slate-400 uppercase mb-2">Mobile Number</label>
              <input id="driverMobile" type="text" formControlName="mobile" class="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ring-indigo-500/20 transition-all">
            </div>
            
            <div>
              <label for="driverStatus" class="block text-xs font-bold text-slate-400 uppercase mb-2">Status</label>
              <select id="driverStatus" formControlName="status" class="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ring-indigo-500/20 transition-all">
                <option value="active">Active</option>
                <option value="busy">Busy</option>
                <option value="offline">Offline</option>
              </select>
            </div>

            <div class="pt-4 flex gap-3">
              <button type="button" (click)="closeModal()" class="flex-1 px-6 py-3 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                Cancel
              </button>
              <button type="submit" [disabled]="driverForm.invalid" class="flex-1 px-6 py-3 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/20">
                {{ editingDriver() ? 'Update Driver' : 'Add Driver' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeliveryList implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  drivers = signal<DeliveryPerson[]>([]);
  filteredDrivers = signal<DeliveryPerson[]>([]);
  searchTerm = signal('');
  
  showModal = signal(false);
  editingDriver = signal<DeliveryPerson | null>(null);
  
  driverForm = this.fb.group({
    name: ['', [Validators.required]],
    mobile: ['', [Validators.required]],
    status: ['active', [Validators.required]]
  });

  activeCount = signal(0);
  busyCount = signal(0);

  ngOnInit() {
    this.loadDrivers();
  }

  loadDrivers() {
    this.api.getDeliveryTeam().subscribe({
      next: (d) => {
        this.drivers.set(d);
        this.applyFilter();
        this.updateStats();
      },
      error: () => this.toast.error('Failed to load delivery team')
    });
  }

  updateStats() {
    const all = this.drivers();
    this.activeCount.set(all.filter(d => d.status === 'active').length);
    this.busyCount.set(all.filter(d => d.status === 'busy').length);
  }

  onSearch(event: Event) {
    const term = (event.target as HTMLInputElement).value;
    this.searchTerm.set(term);
    this.applyFilter();
  }

  applyFilter() {
    const term = this.searchTerm().toLowerCase();
    if (!term) {
      this.filteredDrivers.set(this.drivers());
      return;
    }
    this.filteredDrivers.set(
      this.drivers().filter(d => 
        d.name.toLowerCase().includes(term) || 
        d.mobile.includes(term) ||
        d.id?.toString().includes(term)
      )
    );
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
      case 'busy': return 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400';
      case 'offline': return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
      default: return 'bg-slate-100 text-slate-600';
    }
  }

  openModal(driver?: DeliveryPerson) {
    if (driver) {
      this.editingDriver.set(driver);
      this.driverForm.patchValue({
        name: driver.name,
        mobile: driver.mobile,
        status: driver.status
      });
    } else {
      this.editingDriver.set(null);
      this.driverForm.reset({ status: 'active' });
    }
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.editingDriver.set(null);
    this.driverForm.reset();
  }

  saveDriver() {
    if (this.driverForm.invalid) return;

    const driverData = this.driverForm.value as Partial<DeliveryPerson>;
    const editing = this.editingDriver();

    if (editing) {
      this.api.updateDeliveryPerson(editing.id!, driverData).subscribe({
        next: () => {
          this.toast.success('Driver updated successfully');
          this.loadDrivers();
          this.closeModal();
        },
        error: () => this.toast.error('Failed to update driver')
      });
    } else {
      this.api.createDeliveryPerson(driverData).subscribe({
        next: () => {
          this.toast.success('Driver added successfully');
          this.loadDrivers();
          this.closeModal();
        },
        error: () => this.toast.error('Failed to add driver')
      });
    }
  }

  deleteDriver(driver: DeliveryPerson) {
    if (confirm(`Are you sure you want to remove ${driver.name}?`)) {
      this.api.deleteDeliveryPerson(driver.id!).subscribe({
        next: () => {
          this.toast.success('Driver removed successfully');
          this.loadDrivers();
        },
        error: () => this.toast.error('Failed to remove driver')
      });
    }
  }
}
