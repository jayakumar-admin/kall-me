import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { BackupAuthService } from '../services/backup-auth.service';

export const backupAuthGuard: CanActivateFn = async (route, state) => {
  const backupAuth = inject(BackupAuthService);
  const router = inject(Router);

  if (backupAuth.isUnlocked()) {
    return true;
  }

  const granted = await backupAuth.requestUnlock();
  if (granted) {
    return true;
  }

  // If verification failed or was cancelled, redirect away from protected route
  router.navigate(['/app/settings']);
  return false;
};
