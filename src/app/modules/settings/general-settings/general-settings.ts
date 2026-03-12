import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../services/toast.service';
import { SettingsService } from '../../../services/settings.service';

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
                  <input id="adminCommission" type="number" [(ngModel)]="financial.adminCommission" class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg pl-4 pr-10 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#FFC107] dark:text-white">
                  <span class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                </div>
                <p class="text-[10px] text-slate-400 mt-2">Percentage taken from each restaurant order.</p>
              </div>
              <div>
                <label for="taxRegNumber" class="text-xs font-bold text-slate-500 mb-2 block">Tax Registration Number</label>
                <input id="taxRegNumber" type="text" [(ngModel)]="financial.taxRegNumber" class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#FFC107] dark:text-white">
              </div>
            </div>

            <div class="grid grid-cols-2 gap-6">
              <div>
                <label for="gstPercentage" class="text-xs font-bold text-slate-500 mb-2 block">GST (%)</label>
                <div class="relative">
                  <input id="gstPercentage" type="number" [(ngModel)]="taxes.gst" class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg pl-4 pr-10 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#FFC107] dark:text-white">
                  <span class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                </div>
              </div>
              <div>
                <label for="igstPercentage" class="text-xs font-bold text-slate-500 mb-2 block">IGST (%)</label>
                <div class="relative">
                  <input id="igstPercentage" type="number" [(ngModel)]="taxes.igst" class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg pl-4 pr-10 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#FFC107] dark:text-white">
                  <span class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                </div>
              </div>
            </div>

            <div class="p-4 bg-[#FFC107]/5 rounded-xl flex items-center justify-between border border-[#FFC107]/10">
              <div>
                <p class="text-sm font-bold text-[#1A1A1A] dark:text-white">Auto-settlement to Restaurants</p>
                <p class="text-[10px] text-slate-500">Automatically trigger bank transfers every 24 hours.</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" [(ngModel)]="financial.autoSettlement" class="sr-only peer">
                <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-[#FFC107]"></div>
              </label>
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
                  <input id="deliveryCharge" type="number" [(ngModel)]="logistics.defaultDeliveryCharge" class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg pl-8 pr-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#FFC107] dark:text-white">
                </div>
              </div>
              <div>
                <label for="freeDeliveryThreshold" class="text-xs font-bold text-slate-500 mb-2 block">Free Delivery Threshold</label>
                <div class="relative">
                  <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input id="freeDeliveryThreshold" type="number" [(ngModel)]="logistics.freeDeliveryThreshold" class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg pl-8 pr-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#FFC107] dark:text-white">
                </div>
              </div>
            </div>

            <div>
              <label for="deliveryRadius" class="text-xs font-bold text-slate-500 mb-2 block">Default Delivery Radius (km): {{ logistics.deliveryRadius }}</label>
              <input id="deliveryRadius" type="range" min="1" max="50" [(ngModel)]="logistics.deliveryRadius" class="w-full accent-[#FFC107]">
              <div class="flex justify-between text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">
                <span>1km</span>
                <span class="text-[#FFC107]">15km</span>
                <span>50km</span>
              </div>
            </div>
          </div>
          <!-- Feature Configuration -->
          <div class="card space-y-6 border-none ring-1 ring-slate-100 dark:ring-white/5">
            <div class="flex items-center gap-2">
              <mat-icon class="text-[#FFC107]">toggle_on</mat-icon>
              <h3 class="font-bold text-[#1A1A1A] dark:text-white">Feature Configuration</h3>
            </div>
            
            <div class="space-y-4">
              <div class="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                <div>
                  <p class="text-sm font-bold text-[#1A1A1A] dark:text-white">Customer Ratings & Reviews</p>
                  <p class="text-[10px] text-slate-500">Allow customers to rate orders and leave reviews.</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" [(ngModel)]="features.ratings" class="sr-only peer">
                  <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-[#FFC107]"></div>
                </label>
              </div>

              <div class="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                <div>
                  <p class="text-sm font-bold text-[#1A1A1A] dark:text-white">Live Order Tracking</p>
                  <p class="text-[10px] text-slate-500">Enable real-time GPS tracking for active deliveries.</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" [(ngModel)]="features.liveTracking" class="sr-only peer">
                  <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-[#FFC107]"></div>
                </label>
              </div>

              <div class="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                <div>
                  <p class="text-sm font-bold text-[#1A1A1A] dark:text-white">Promo Codes & Discounts</p>
                  <p class="text-[10px] text-slate-500">Enable the promotional code system during checkout.</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" [(ngModel)]="features.promoCodes" class="sr-only peer">
                  <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-[#FFC107]"></div>
                </label>
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
export class GeneralSettings implements OnInit {
  toast = inject(ToastService);
  settingsService = inject(SettingsService);

  taxes = {
    gst: 18,
    igst: 0
  };

  financial = {
    adminCommission: 15,
    taxRegNumber: 'TAX-KALL-99201',
    autoSettlement: true
  };

  logistics = {
    defaultDeliveryCharge: 49,
    freeDeliveryThreshold: 499,
    deliveryRadius: 15
  };

  features = {
    ratings: true,
    liveTracking: true,
    promoCodes: false
  };

  ngOnInit() {
    const settings = this.settingsService.settings();
    this.taxes = { ...settings.taxes };
    this.financial = { ...settings.financial };
    this.logistics = { ...settings.logistics };
    this.features = { ...settings.features };
  }

  save() {
    this.settingsService.updateSettings({
      taxes: this.taxes,
      financial: this.financial,
      logistics: this.logistics,
      features: this.features
    });
    this.toast.success('Settings saved successfully');
  }

  discard() {
    this.ngOnInit();
    this.toast.info('Changes discarded');
  }

  contactSupport() {
    this.toast.info('Support request sent. Our team will contact you shortly.');
  }
}
