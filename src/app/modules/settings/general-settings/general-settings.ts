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
        <div class="lg:col-span-3 space-y-8 p-2">
          <!-- Financial -->
          <div class="card space-y-6 border-none ring-1 ring-slate-100 dark:ring-white/5">
            <div class="flex items-center gap-2">
              <mat-icon class="text-[#FFC107]">payments</mat-icon>
              <h3 class="font-bold text-[#1A1A1A] dark:text-white">Financial Commission Settings</h3>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div>
                <label for="taxRegNumber" class="text-xs font-bold text-slate-500 mb-2 block">Tax Registration Number</label>
                <input id="taxRegNumber" type="text" [(ngModel)]="financial.taxRegNumber" class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#FFC107] dark:text-white">
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
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

            <!-- Admin Commission Ranges moved to separate route -->
 <!--
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
          -->

          <!-- WhatsApp Configuration -->
          <div class="card space-y-6 border-none ring-1 ring-slate-100 dark:ring-white/5">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <mat-icon class="text-[#25D366]">message</mat-icon>
                <h3 class="font-bold text-[#1A1A1A] dark:text-white">WhatsApp Configuration</h3>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" [(ngModel)]="whatsapp.enabled" class="sr-only peer">
                <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-[#25D366]"></div>
              </label>
            </div>

            <div class="grid grid-cols-1 gap-6" [class.opacity-50]="!whatsapp.enabled">
              <div>
                <label for="whatsappApiUrl" class="text-xs font-bold text-slate-500 mb-2 block">WhatsApp API URL</label>
                <input id="whatsappApiUrl" type="text" [(ngModel)]="whatsapp.apiUrl" [disabled]="!whatsapp.enabled" class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#25D366] dark:text-white" placeholder="https://graph.facebook.com/v22.0/...">
              </div>
              <div>
                <label for="whatsappApiKey" class="text-xs font-bold text-slate-500 mb-2 block">API Key</label>
                <input id="whatsappApiKey" type="password" [(ngModel)]="whatsapp.apiKey" [disabled]="!whatsapp.enabled" class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#25D366] dark:text-white" placeholder="Your secret API key or token">
              </div>
              <div>
                <label for="welcomeMessageTemplate" class="text-xs font-bold text-slate-500 mb-2 block">Welcome Message Template Name</label>
                <input id="welcomeMessageTemplate" type="text" [(ngModel)]="whatsapp.welcomeMessageTemplate" [disabled]="!whatsapp.enabled" class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#25D366] dark:text-white" placeholder="welcome_message">
              </div>
              <div>
                <label for="orderConfirmationClientTemplate" class="text-xs font-bold text-slate-500 mb-2 block">Order Confirmation (Client) Template Name</label>
                <input id="orderConfirmationClientTemplate" type="text" [(ngModel)]="whatsapp.orderConfirmationClientTemplate" [disabled]="!whatsapp.enabled" class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#25D366] dark:text-white" placeholder="order_confirmation_client">
              </div>
              <div>
                <label for="orderConfirmationAdminTemplate" class="text-xs font-bold text-slate-500 mb-2 block">Order Confirmation (Admin) Template Name</label>
                <input id="orderConfirmationAdminTemplate" type="text" [(ngModel)]="whatsapp.orderConfirmationAdminTemplate" [disabled]="!whatsapp.enabled" class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#25D366] dark:text-white" placeholder="order_confirmation_admin">
              </div>
              <div>
                <label for="orderCancelledTemplate" class="text-xs font-bold text-slate-500 mb-2 block">Order Cancelled Template Name</label>
                <input id="orderCancelledTemplate" type="text" [(ngModel)]="whatsapp.orderCancelledTemplate" [disabled]="!whatsapp.enabled" class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#25D366] dark:text-white" placeholder="order_cancelled">
              </div>
              <div>
                <label for="deliveryOnboardTemplate" class="text-xs font-bold text-slate-500 mb-2 block">Delivery Onboard Template Name</label>
                <input id="deliveryOnboardTemplate" type="text" [(ngModel)]="whatsapp.deliveryOnboardTemplate" [disabled]="!whatsapp.enabled" class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#25D366] dark:text-white" placeholder="delivery_onboard">
              </div>
            </div>
            
            @if (whatsapp.enabled) {
              <div class="p-4 bg-emerald-50 dark:bg-emerald-500/5 rounded-xl border border-emerald-100 dark:border-emerald-500/10">
                <p class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest mb-1">Status: Active</p>
                <p class="text-xs text-slate-500 dark:text-slate-400">WhatsApp notifications will be sent for order confirmations and delivery assignments.</p>
              </div>
            }
          </div>
        </div>

        <!-- Sidebar Settings -->
        <div class="space-y-8">
              <div class="card bg-[#1A1A1A] text-white space-y-6 border-none">
                <h3 class="font-bold">Need Assistance?</h3>
                <p class="text-xs text-slate-400">Our system configuration specialists are available 24/7 to help you tune your delivery operations.</p>
                
                <div>
                  <label for="supportNumber" class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Support WhatsApp Number</label>
                  <input id="supportNumber" type="text" [(ngModel)]="supportNumber" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-[#FFC107] text-white mb-4" placeholder="e.g. 919876543210">
                </div>

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
    autoSettlement: true,
    commissionType: 'percentage' as 'percentage' | 'fixed'
  };

  logistics = {
    defaultDeliveryCharge: 49,
    freeDeliveryThreshold: 499,
    deliveryRadius: 15,
    shippingType: 'fixed' as 'percentage' | 'fixed'
  };

  features = {
    ratings: true,
    liveTracking: true,
    promoCodes: false
  };

  whatsapp = {
    apiUrl: '',
    apiKey: '',
    welcomeMessageTemplate: '',
    orderConfirmationClientTemplate: '',
    orderConfirmationAdminTemplate: '',
    orderCancelledTemplate: '',
    deliveryOnboardTemplate: '',
    enabled: false
  };

  supportNumber = '919876543210';

  ngOnInit() {
    const settings = this.settingsService.settings();
    this.taxes = { ...settings.taxes };
    this.financial = { ...settings.financial };
    this.logistics = { ...settings.logistics };
    this.features = { ...settings.features };
    this.whatsapp = { ...settings.whatsapp };
    this.supportNumber = settings.supportNumber || '918903035099';
  }

  save() {
    this.settingsService.updateSettings({
      taxes: this.taxes,
      financial: this.financial,
      logistics: this.logistics,
      features: this.features,
      whatsapp: this.whatsapp,
      supportNumber: this.supportNumber
    });
    this.toast.success('Settings saved successfully');
  }

  discard() {
    this.ngOnInit();
    this.toast.info('Changes discarded');
  }

  contactSupport() {
    const message = encodeURIComponent('Hi AJR Digital Hub, I need support from you');
    const url = `https://wa.me/${this.supportNumber}?text=${message}`;
    window.open(url, '_blank');
  }
}
