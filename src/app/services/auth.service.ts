import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { finalize, tap } from 'rxjs';
import { LoaderService } from './loader.service';
import { ApiService } from './api.service';
import { ToastService } from './toast.service';

export interface User {
  id: number;
  name: string;
  email: string;
  mobile?: string;
  role: 'admin' | 'delivery' | 'staff';
  token?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private router = inject(Router);
  private http = inject(HttpClient);
  private loader = inject(LoaderService);
  private toast = inject(ToastService);
  private userSignal = signal<User | null>(null);
  public permissionsSignal = signal<Record<string, boolean>>({});
  private api = inject(ApiService);
  public baseUrl = this.api.baseUrl;

  user = computed(() => this.userSignal());
  isLoggedIn = computed(() => !!this.userSignal());
  isAdmin = computed(() => this.userSignal()?.role === 'admin');
  isDelivery = computed(() => this.userSignal()?.role === 'delivery');
  permissions = computed(() => this.permissionsSignal());

  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private warningTimer: ReturnType<typeof setTimeout> | null = null;
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private lastRecordedActivity = 0;

  // 48 hours inactivity limit
  private readonly INACTIVITY_LIMIT = 48 * 60 * 60 * 1000; // 48 hours in milliseconds
  private readonly WARNING_BUFFER = 15 * 60 * 1000; // 15 minutes warning before 48h expiration
  private readonly ACTIVITY_THROTTLE_MS = 30 * 1000; // Throttle writing activity to localStorage (once every 30s)

  private activityListener = () => this.recordActivity(true);
  private visibilityListener = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      this.checkInactivityExpiration();
    }
  };
  private focusListener = () => this.checkInactivityExpiration();
  private storageListener = (e: StorageEvent) => {
    if (e.key === 'kallme_last_activity') {
      this.scheduleInactivityTimers();
    } else if (e.key === 'kallme_user' && !e.newValue && this.isLoggedIn()) {
      this.logout('Session closed in another window.');
    }
  };

  constructor() {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const storedUser = localStorage.getItem('kallme_user');
      const storedPermissions = localStorage.getItem('kallme_permissions');
      const storedLastActivity = localStorage.getItem('kallme_last_activity');
      
      if (storedUser) {
        const now = Date.now();
        const lastActivity = storedLastActivity ? parseInt(storedLastActivity, 10) : now;
        
        // Auto-logout if user has had no activity for 48 hours
        if (storedLastActivity && (!isNaN(lastActivity) && (now - lastActivity) >= this.INACTIVITY_LIMIT)) {
          this.logout('Session expired after 48 hours of inactivity.');
          return;
        }

        try {
          this.userSignal.set(JSON.parse(storedUser));
          if (storedPermissions) {
            this.permissionsSignal.set(JSON.parse(storedPermissions));
          }
          if (!storedLastActivity) {
            localStorage.setItem('kallme_last_activity', now.toString());
          }
          this.setupInactivityListeners();
        } catch {
          this.logout();
        }
      }
    }
  }

  private setupInactivityListeners() {
    if (typeof window === 'undefined') return;
    this.removeInactivityListeners();

    window.addEventListener('mousemove', this.activityListener, { passive: true });
    window.addEventListener('keydown', this.activityListener, { passive: true });
    window.addEventListener('click', this.activityListener, { passive: true });
    window.addEventListener('scroll', this.activityListener, { passive: true });
    window.addEventListener('touchstart', this.activityListener, { passive: true });
    window.addEventListener('focus', this.focusListener);
    window.addEventListener('storage', this.storageListener);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.visibilityListener);
    }

    // Periodic check every 60 seconds
    this.checkInterval = setInterval(() => {
      this.checkInactivityExpiration();
    }, 60 * 1000);

    this.scheduleInactivityTimers();
  }

  private removeInactivityListeners() {
    if (typeof window === 'undefined') return;

    window.removeEventListener('mousemove', this.activityListener);
    window.removeEventListener('keydown', this.activityListener);
    window.removeEventListener('click', this.activityListener);
    window.removeEventListener('scroll', this.activityListener);
    window.removeEventListener('touchstart', this.activityListener);
    window.removeEventListener('focus', this.focusListener);
    window.removeEventListener('storage', this.storageListener);
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityListener);
    }

    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  public recordActivity(isUserInteraction = true) {
    if (!this.isLoggedIn()) return;

    const now = Date.now();
    const storedLastActivity = typeof localStorage !== 'undefined' ? localStorage.getItem('kallme_last_activity') : null;
    const lastActivity = storedLastActivity ? parseInt(storedLastActivity, 10) : now;

    if (storedLastActivity && !isNaN(lastActivity) && (now - lastActivity) >= this.INACTIVITY_LIMIT) {
      this.logout('Session expired after 48 hours of inactivity.');
      return;
    }

    if (isUserInteraction && typeof localStorage !== 'undefined') {
      if (now - this.lastRecordedActivity > this.ACTIVITY_THROTTLE_MS) {
        this.lastRecordedActivity = now;
        localStorage.setItem('kallme_last_activity', now.toString());
      }
    }

    this.scheduleInactivityTimers(now);
  }

  private scheduleInactivityTimers(referenceTime?: number) {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    if (this.warningTimer) clearTimeout(this.warningTimer);

    if (!this.isLoggedIn() || typeof localStorage === 'undefined') return;

    const now = Date.now();
    const storedLastActivity = localStorage.getItem('kallme_last_activity');
    const lastActivity = storedLastActivity ? parseInt(storedLastActivity, 10) : (referenceTime || now);
    const elapsed = Math.max(0, now - lastActivity);
    const remainingTime = this.INACTIVITY_LIMIT - elapsed;

    if (remainingTime <= 0) {
      this.logout('Session expired after 48 hours of inactivity.');
      return;
    }

    this.inactivityTimer = setTimeout(() => {
      this.checkInactivityExpiration();
    }, remainingTime);

    const warningRemaining = (this.INACTIVITY_LIMIT - this.WARNING_BUFFER) - elapsed;
    if (warningRemaining > 0) {
      this.warningTimer = setTimeout(() => {
        this.toast.info('Your session will expire in 15 minutes due to inactivity. Move or click to stay signed in.');
      }, warningRemaining);
    }
  }

  private checkInactivityExpiration() {
    if (!this.isLoggedIn() || typeof localStorage === 'undefined') return;

    const storedLastActivity = localStorage.getItem('kallme_last_activity');
    if (storedLastActivity) {
      const lastActivity = parseInt(storedLastActivity, 10);
      if (!isNaN(lastActivity) && (Date.now() - lastActivity) >= this.INACTIVITY_LIMIT) {
        this.logout('Session expired after 48 hours of inactivity.');
      }
    }
  }

  login(credentials: { email?: string | null; password?: string | null; mobile?: string | null; role?: 'admin' | 'delivery' }, returnUrl?: string | null) {
    this.loader.show('Authenticating...');
    const endpoint = `${this.baseUrl}/auth/login`;
    
    // Normalize credentials (use email field for both email and mobile)
    const payload = {
      email: credentials.email || credentials.mobile,
      password: credentials.password
    };
    
    return this.http.post<{ success: boolean; accessToken: string; user: User; permissions?: { menu_name: string; enabled: boolean }[] }>(endpoint, payload, { withCredentials: true }).pipe(
      tap(response => {
        if (response.success) {
          const user = { ...response.user, token: response.accessToken };
          this.userSignal.set(user);
          localStorage.setItem('kallme_user', JSON.stringify(user));
          
          const now = Date.now();
          this.lastRecordedActivity = now;
          localStorage.setItem('kallme_last_activity', now.toString());

          if (response.permissions) {
            const perms: Record<string, boolean> = {};
            response.permissions.forEach(p => perms[p.menu_name] = p.enabled);
            this.permissionsSignal.set(perms);
            localStorage.setItem('kallme_permissions', JSON.stringify(perms));
          }

          this.setupInactivityListeners();
          
          if (returnUrl) {
            this.router.navigate([returnUrl]);
          } else if (user.role === 'delivery') {
            this.router.navigate(['/app/delivery-dashboard']);
          } else {
            this.router.navigate(['/app/create-order']);
          }
        }
      }),
      finalize(() => this.loader.hide())
    );
  }

  logout(reason?: string) {
    this.removeInactivityListeners();

    const endpoint = `${this.baseUrl}/auth/logout`;
    this.http.post(endpoint, {}, { withCredentials: true }).subscribe({
      error: () => {}
    });

    const hadUser = !!this.userSignal();
    this.userSignal.set(null);
    this.permissionsSignal.set({});

    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('kallme_user');
      localStorage.removeItem('kallme_permissions');
      localStorage.removeItem('kallme_last_activity');
    }

    if (hadUser) {
      if (reason) {
        this.toast.info(reason);
      } else {
        this.toast.success('Logged out successfully.');
      }
    }

    this.router.navigate(['/login']);
  }

  refreshToken() {
    return this.http.post<{ accessToken: string }>(`${this.baseUrl}/auth/refresh`, {}, { withCredentials: true }).pipe(
      tap(response => {
        const user = this.userSignal();
        if (user) {
          const updatedUser = { ...user, token: response.accessToken };
          this.userSignal.set(updatedUser);
          localStorage.setItem('kallme_user', JSON.stringify(updatedUser));
        }
      })
    );
  }

  forgotPassword(data: { email?: string; mobile?: string }) {
    this.loader.show('Sending reset token...');
    return this.http.post<{ message: string }>(`${this.baseUrl}/auth/forgot-password`, data).pipe(
      finalize(() => this.loader.hide())
    );
  }

  resetPassword(data: { token: string; newPassword: string }) {
    this.loader.show('Resetting password...');
    return this.http.post<{ message: string }>(`${this.baseUrl}/auth/reset-password`, data).pipe(
      finalize(() => this.loader.hide())
    );
  }

  changePassword(data: { currentPassword: string; newPassword: string }) {
    this.loader.show('Changing password...');
    return this.http.post<{ message: string }>(`${this.baseUrl}/auth/change-password`, data).pipe(
      finalize(() => this.loader.hide())
    );
  }
}
