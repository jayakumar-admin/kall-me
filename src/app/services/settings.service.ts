import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

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
    apiKey: string;
    phoneNumberId: string;
    businessAccountId: string;
    enabled: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private http = inject(HttpClient);
  private baseUrl = '/api/settings';

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
      apiKey: '',
      phoneNumberId: '',
      businessAccountId: '',
      enabled: false
    }
  };

  settings = signal<AppSettings>(this.defaultSettings);

  constructor() {
    this.loadSettings();
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
}
