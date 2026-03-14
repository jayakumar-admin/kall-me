import { Routes } from '@angular/router';

export const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'general',
    pathMatch: 'full'
  },
  {
    path: 'general',
    loadComponent: () => import('./general-settings/general-settings').then(m => m.GeneralSettings)
  },
  {
    path: 'hotel-management',
    loadComponent: () => import('./hotel-management/hotel-management').then(m => m.HotelManagement)
  },
  {
    path: 'menu-bulk-add',
    loadComponent: () => import('./menu-bulk-add/menu-bulk-add').then(m => m.MenuBulkAdd)
  },
  {
    path: 'merchant-menu-editor',
    loadComponent: () => import('./merchant-menu-editor/merchant-menu-editor').then(m => m.MerchantMenuEditor)
  },
  {
    path: 'whatsapp-logs',
    loadComponent: () => import('./whatsapp-logs/whatsapp-logs').then(m => m.WhatsAppLogs)
  }
];
