import { Injectable, signal } from '@angular/core';

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

  settings = signal<AppSettings>(this.loadSettings());

  private loadSettings(): AppSettings {
    const saved = localStorage.getItem('app_settings');
    if (saved) {
      try {
        return { ...this.defaultSettings, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Failed to parse settings', e);
      }
    }
    return this.defaultSettings;
  }

  updateSettings(newSettings: Partial<AppSettings>) {
    this.settings.update(current => {
      const updated = { ...current, ...newSettings };
      localStorage.setItem('app_settings', JSON.stringify(updated));
      return updated;
    });
  }
}
