import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'landing',
    pathMatch: 'full'
  },
  {
    path: 'landing',
    loadComponent: () => import('./modules/landing/landing').then(m => m.Landing)
  },
  {
    path: 'login',
    loadComponent: () => import('./modules/auth/login').then(m => m.Login)
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./modules/auth/forgot-password').then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./modules/auth/reset-password').then(m => m.ResetPasswordComponent)
  },
  {
    path: 'delivery-login',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'app',
    loadComponent: () => import('./modules/layout/layout').then(m => m.Layout),
    canActivate: [authGuard],
    children: [
      // Admin Routes
      {
        path: 'dashboard',
        loadComponent: () => import('./modules/dashboard/dashboard').then(m => m.Dashboard),
        canActivate: [roleGuard(['admin'])]
      },
      {
        path: 'create-order',
        loadComponent: () => import('./modules/orders/create-order').then(m => m.CreateOrder),
        canActivate: [roleGuard(['admin'])]
      },
      {
        path: 'invoice',
        loadComponent: () => import('./modules/invoice/invoice-generation').then(m => m.InvoiceGeneration),
        canActivate: [roleGuard(['admin'])]
      },
      {
        path: 'bulk-invoice',
        loadComponent: () => import('./modules/invoice/bulk-invoice-generation').then(m => m.BulkInvoiceGeneration),
        canActivate: [roleGuard(['admin'])]
      },
      {
        path: 'orders',
        loadComponent: () => import('./modules/orders/orders-list').then(m => m.OrdersList),
        canActivate: [roleGuard(['admin'])]
      },
      {
        path: 'orders/:id',
        loadComponent: () => import('./modules/orders/order-details').then(m => m.OrderDetails),
        canActivate: [roleGuard(['admin'])]
      },
      {
        path: 'hotels',
        loadComponent: () => import('./modules/hotels/hotels-list').then(m => m.HotelsList),
        canActivate: [roleGuard(['admin'])]
      },
      {
        path: 'hotels/create',
        loadComponent: () => import('./modules/hotels/hotel-form').then(m => m.HotelForm),
        canActivate: [roleGuard(['admin'])]
      },
      {
        path: 'hotels/:id',
        loadComponent: () => import('./modules/hotels/hotel-details').then(m => m.HotelDetails),
        canActivate: [roleGuard(['admin'])]
      },
      {
        path: 'hotels/:id/edit',
        loadComponent: () => import('./modules/hotels/hotel-form').then(m => m.HotelForm),
        canActivate: [roleGuard(['admin'])]
      },
      {
        path: 'delivery',
        loadComponent: () => import('./modules/delivery/delivery-list').then(m => m.DeliveryList),
        canActivate: [roleGuard(['admin'])]
      },
      {
        path: 'delivery-reports',
        loadComponent: () => import('./modules/delivery-reports/delivery-reports').then(m => m.DeliveryReports),
        canActivate: [roleGuard(['admin'])]
      },
      {
        path: 'reports',
        loadComponent: () => import('./modules/reports/reports').then(m => m.Reports),
        canActivate: [roleGuard(['admin'])]
      },
      {
        path: 'settings',
        loadComponent: () => import('./modules/settings/settings').then(m => m.Settings),
        loadChildren: () => import('./modules/settings/settings.routes').then(m => m.SETTINGS_ROUTES),
        canActivate: [roleGuard(['admin'])]
      },

      // Delivery Portal Routes
      {
        path: 'delivery-dashboard',
        loadComponent: () => import('./modules/delivery-portal/dashboard/dashboard').then(m => m.DeliveryDashboard),
        canActivate: [roleGuard(['delivery'])]
      },
      {
        path: 'delivery-orders',
        loadComponent: () => import('./modules/delivery-portal/orders/orders').then(m => m.DeliveryOrders),
        canActivate: [roleGuard(['delivery'])]
      },
      {
        path: 'delivery-profile',
        loadComponent: () => import('./modules/delivery-portal/profile/profile').then(m => m.DeliveryProfile),
        canActivate: [roleGuard(['delivery'])]
      },

      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: '' }
];
