import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-general-settings',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  template: `
    <div class="space-y-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-display font-black text-[#1A1A1A] dark:text-white uppercase tracking-tight">General Settings</h1>
          <p class="text-slate-500 dark:text-slate-400">Manage your platform's core business parameters.</p>
        </div>
        <div class="flex gap-3">
          <button (click)="discard()" class="px-6 py-2 rounded-xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 font-bold text-sm">Discard</button>
          <button (click)="save()" class="btn-primary">Save Changes</button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="lg:col-span-2 space-y-8">
          <!-- Financial -->
          <div class="card space-y-6 border-none ring-1 ring-slate-100 dark:ring-white/5">
            <div class="flex items-center gap-2">
              <mat-icon class="text-[#FFC107]">payments</mat-icon>
              <h3 class="font-bold text-[#1A1A1A] dark:text-white">Financial Commission Settings</h3>
            </div>
            
            <div class="grid grid-cols-2 gap-6">
              <div>
                <label for="adminCommission" class="text-xs font-bold text-slate-500 mb-2 block">Admin Commission (%)</label>
                <div class="relative">
                  <input id="adminCommission" type="number" value="15" class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg pl-4 pr-10 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#FFC107] dark:text-white">
                  <span class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                </div>
                <p class="text-[10px] text-slate-400 mt-2">Percentage taken from each restaurant order.</p>
              </div>
              <div>
                <label for="taxRegNumber" class="text-xs font-bold text-slate-500 mb-2 block">Tax Registration Number</label>
                <input id="taxRegNumber" type="text" value="TAX-KALL-99201" class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#FFC107] dark:text-white">
              </div>
            </div>

            <div class="p-4 bg-[#FFC107]/5 rounded-xl flex items-center justify-between border border-[#FFC107]/10">
              <div>
                <p class="text-sm font-bold text-[#1A1A1A] dark:text-white">Auto-settlement to Restaurants</p>
                <p class="text-[10px] text-slate-500">Automatically trigger bank transfers every 24 hours.</p>
              </div>
              <div class="w-12 h-6 bg-[#FFC107] rounded-full relative cursor-pointer">
                <div class="absolute right-1 top-1 w-4 h-4 bg-black rounded-full"></div>
              </div>
            </div>
          </div>

          <!-- Logistics -->
          <div class="card space-y-6 border-none ring-1 ring-slate-100 dark:ring-white/5">
            <div class="flex items-center gap-2">
              <mat-icon class="text-[#FFC107]">local_shipping</mat-icon>
              <h3 class="font-bold text-[#1A1A1A] dark:text-white">Delivery & Logistics</h3>
            </div>

            <div class="grid grid-cols-2 gap-6">
              <div>
                <label for="deliveryCharge" class="text-xs font-bold text-slate-500 mb-2 block">Default Delivery Charge</label>
                <div class="relative">
                  <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input id="deliveryCharge" type="number" value="49" class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg pl-8 pr-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#FFC107] dark:text-white">
                </div>
              </div>
              <div>
                <label for="freeDeliveryThreshold" class="text-xs font-bold text-slate-500 mb-2 block">Free Delivery Threshold</label>
                <div class="relative">
                  <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input id="freeDeliveryThreshold" type="number" value="499" class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg pl-8 pr-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#FFC107] dark:text-white">
                </div>
              </div>
            </div>

            <div>
              <label for="deliveryRadius" class="text-xs font-bold text-slate-500 mb-2 block">Default Delivery Radius (km)</label>
              <input id="deliveryRadius" type="range" class="w-full accent-[#FFC107]">
              <div class="flex justify-between text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">
                <span>1km</span>
                <span class="text-[#FFC107]">15km</span>
                <span>50km</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar Settings -->
        <div class="space-y-8">
          <div class="card bg-[#1A1A1A] text-white space-y-6 border-none">
            <h3 class="font-bold">Need Assistance?</h3>
            <p class="text-xs text-slate-400">Our system configuration specialists are available 24/7 to help you tune your delivery operations.</p>
            <button (click)="contactSupport()" class="btn-primary w-full">Contact Support</button>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GeneralSettings {
  toast = inject(ToastService);

  save() {
    this.toast.success('Settings saved successfully');
  }

  discard() {
    this.toast.info('Changes discarded');
  }

  contactSupport() {
    this.toast.info('Support request sent. Our team will contact you shortly.');
  }
}
