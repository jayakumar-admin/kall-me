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
    path: 'calculation-type',
    loadComponent: () => import('./calculation-type/calculation-type').then(m => m.CalculationType)
  },
  {
    path: 'commission-management',
    loadComponent: () => import('./commission-management/commission-management').then(m => m.CommissionManagement)
  },
  {
    path: 'delivery-logistics',
    loadComponent: () => import('./delivery-logistics/delivery-logistics').then(m => m.DeliveryLogistics)
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
    path: 'hotel-menu-editor',
    loadComponent: () => import('./hotel-menu-editor/hotel-menu-editor').then(m => m.HotelMenuEditor)
  },
  {
    path: 'menu-editor',
    loadComponent: () => import('./menu-editor/menu-editor').then(m => m.MenuEditor)
  },
  {
    path: 'whatsapp-logs',
    loadComponent: () => import('./whatsapp-logs/whatsapp-logs').then(m => m.WhatsAppLogs)
  },
  {
    path: 'delivery-permissions',
    loadComponent: () => import('./delivery-permissions/delivery-permissions').then(m => m.DeliveryPermissions)
  },
  {
    path: 'security',
    loadComponent: () => import('./security/security').then(m => m.SecuritySettings)
  },
  {
    path: 'user-management',
    loadComponent: () => import('./user-management/user-management').then(m => m.UserManagement)
  }
];
