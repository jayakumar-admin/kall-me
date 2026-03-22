import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ToastService } from './toast.service';
import { ApiService } from './api.service';

export interface ShippingRange {
  id?: number;
  min_amount: number;
  max_amount: number;
  price: number;
}

export interface AppSettings {
  taxes: {
    gst: number;
    igst: number;
  };
  financial: {
    adminCommission: number;
    taxRegNumber: string;
    autoSettlement: boolean;
  };
  logistics: {
    defaultDeliveryCharge: number;
    freeDeliveryThreshold: number;
    deliveryRadius: number;
  };
  features: {
    ratings: boolean;
    liveTracking: boolean;
    promoCodes: boolean;
  };
  whatsapp: {
    apiUrl: string;
    apiKey: string;
    welcomeMessageTemplate: string;
    orderConfirmationClientTemplate: string;
    orderConfirmationAdminTemplate: string;
    orderCancelledTemplate: string;
    deliveryOnboardTemplate: string;
    enabled: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private http = inject(HttpClient);
  private api = inject(ApiService);
  private get baseUrl() { return `${this.api.baseUrl}/settings`; }
  private get shippingUrl() { return `${this.api.baseUrl}/shipping`; }
  private toast = inject(ToastService);

  private defaultSettings: AppSettings = {
    taxes: {
      gst: 18,
      igst: 0
    },
    financial: {
      adminCommission: 15,
      taxRegNumber: 'TAX-KALL-99201',
      autoSettlement: true
    },
    logistics: {
      defaultDeliveryCharge: 49,
      freeDeliveryThreshold: 499,
      deliveryRadius: 15
    },
    features: {
      ratings: true,
      liveTracking: true,
      promoCodes: true
    },
    whatsapp: {
      apiUrl: 'https://graph.facebook.com/v22.0/YOUR_PHONE_NUMBER_ID/messages',
      apiKey: '',
      welcomeMessageTemplate: 'welcome_message',
      orderConfirmationClientTemplate: 'order_confirmation_client',
      orderConfirmationAdminTemplate: 'order_confirmation_admin',
      orderCancelledTemplate: 'order_cancelled',
      deliveryOnboardTemplate: 'delivery_onboard',
      enabled: false
    }
  };

  settings = signal<AppSettings>(this.defaultSettings);
  shippingRanges = signal<ShippingRange[]>([]);

  constructor() {
    this.loadSettings();
    this.loadShippingRanges();
  }

  private loadSettings() {
    this.http.get<Partial<AppSettings>>(this.baseUrl).subscribe({
      next: (data) => {
        if (Object.keys(data).length > 0) {
          this.settings.update(current => ({
            ...current,
            taxes: data.taxes || current.taxes,
            financial: data.financial || current.financial,
            logistics: data.logistics || current.logistics,
            features: data.features || current.features,
            whatsapp: data.whatsapp || current.whatsapp
          }));
        }
      },
      error: (err) => console.error('Failed to load settings', err)
    });
  }

  updateSettings(newSettings: Partial<AppSettings>) {
    this.settings.update(current => {
      const updated = { ...current, ...newSettings };
      this.http.post(this.baseUrl, updated).subscribe({
        error: (err) => console.error('Failed to save settings', err)
      });
      return updated;
    });
  }

  loadShippingRanges() {
    this.http.get<ShippingRange[]>(this.shippingUrl).subscribe({
      next: (ranges) => this.shippingRanges.set(ranges),
      error: (err) => console.error('Failed to load shipping ranges', err)
    });
  }

  updateShippingRanges(ranges: ShippingRange[]) {
    this.http.post(this.shippingUrl, ranges).subscribe({
      next: () => {
        this.shippingRanges.set(ranges);
        this.toast.success('Shipping ranges updated successfully');
      },
      error: (err: unknown) => {
        console.error('Failed to update shipping ranges', err);
        this.toast.error('Failed to update shipping ranges');
      }
    });
  }
}
