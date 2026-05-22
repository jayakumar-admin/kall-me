import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const user = auth.user();

    if (user && allowedRoles.includes(user.role)) {
      return true;
    }

    if (!user) {
      router.navigate(['/login']);
      return false;
    }

    if (user.role === 'delivery') {
      router.navigate(['/app/delivery-dashboard']);
    } else if (user.role === 'admin') {
      router.navigate(['/app/create-order']);
    } else {
      router.navigate(['/login']);
    }
    
    return false;
  };
};
