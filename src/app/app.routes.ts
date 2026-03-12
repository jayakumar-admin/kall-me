import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./modules/auth/login').then(m => m.Login)
  },
  {
    path: '',
    loadComponent: () => import('./modules/layout/layout').then(m => m.Layout),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./modules/dashboard/dashboard').then(m => m.Dashboard)
      },
      {
        path: 'create-order',
        loadComponent: () => import('./modules/orders/create-order').then(m => m.CreateOrder)
      },
      {
        path: 'invoice',
        loadComponent: () => import('./modules/invoice/invoice-generation').then(m => m.InvoiceGeneration)
      },
      {
        path: 'orders',
        loadComponent: () => import('./modules/orders/orders-list').then(m => m.OrdersList)
      },
      {
        path: 'hotels',
        loadComponent: () => import('./modules/hotels/hotels-list').then(m => m.HotelsList)
      },
      {
        path: 'delivery',
        loadComponent: () => import('./modules/delivery/delivery-list').then(m => m.DeliveryList)
      },
      {
        path: 'reports',
        loadComponent: () => import('./modules/reports/reports').then(m => m.Reports)
      },
      {
        path: 'settings',
        loadComponent: () => import('./modules/settings/settings').then(m => m.Settings),
        loadChildren: () => import('./modules/settings/settings.routes').then(m => m.SETTINGS_ROUTES)
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
