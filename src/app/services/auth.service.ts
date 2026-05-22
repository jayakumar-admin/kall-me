import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { finalize, tap } from 'rxjs';
import { LoaderService } from './loader.service';
import { ApiService } from './api.service';

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
  private readonly INACTIVITY_LIMIT = 60 * 60 * 1000; // 1 hour
  private readonly WARNING_TIME = 59 * 60 * 1000; // 59 minutes

  constructor() {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const storedUser = localStorage.getItem('kallme_user');
      const storedPermissions = localStorage.getItem('kallme_permissions');
      
      if (storedUser) {
        try {
          this.userSignal.set(JSON.parse(storedUser));
          if (storedPermissions) {
            this.permissionsSignal.set(JSON.parse(storedPermissions));
          }
          this.setupInactivityListeners();
        } catch {
          localStorage.removeItem('kallme_user');
          localStorage.removeItem('kallme_permissions');
        }
      }
    }
  }

  private setupInactivityListeners() {
    const resetTimer = () => this.resetInactivityTimer();
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('click', resetTimer);
    window.addEventListener('scroll', resetTimer);
    this.resetInactivityTimer();
  }

  private resetInactivityTimer() {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    if (this.warningTimer) clearTimeout(this.warningTimer);

    if (this.isLoggedIn()) {
      this.warningTimer = setTimeout(() => {
        alert('Your session will expire in 1 minute due to inactivity.');
      }, this.WARNING_TIME);

      this.inactivityTimer = setTimeout(() => {
        this.logout();
      }, this.INACTIVITY_LIMIT);
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

  logout() {
    const endpoint = `${this.baseUrl}/auth/logout`;
    this.http.post(endpoint, {}, { withCredentials: true }).subscribe();
    this.userSignal.set(null);
    this.permissionsSignal.set({});
    localStorage.removeItem('kallme_user');
    localStorage.removeItem('kallme_permissions');
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
