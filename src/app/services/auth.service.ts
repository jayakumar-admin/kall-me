import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { finalize, tap } from 'rxjs';
import { LoaderService } from './loader.service';

export interface User {
  name: string;
  email: string;
  role: string;
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
  private baseUrl = 'https://api-yoyvsxnlqq-uc.a.run.app/api';

  user = computed(() => this.userSignal());
  isLoggedIn = computed(() => !!this.userSignal());

  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private warningTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly INACTIVITY_LIMIT = 60 * 60 * 1000; // 1 hour
  private readonly WARNING_TIME = 59 * 60 * 1000; // 59 minutes

  constructor() {
    const storedUser = localStorage.getItem('kallme_user');
    if (storedUser) {
      try {
        this.userSignal.set(JSON.parse(storedUser));
        this.setupInactivityListeners();
      } catch {
        localStorage.removeItem('kallme_user');
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

  login(credentials: { email?: string | null; password?: string | null }) {
    this.loader.show('Authenticating...');
    return this.http.post<{ success: boolean; accessToken: string; user: User }>(`${this.baseUrl}/auth/login`, credentials).pipe(
      tap(response => {
        if (response.success) {
          const user = { ...response.user, token: response.accessToken };
          this.userSignal.set(user);
          localStorage.setItem('kallme_user', JSON.stringify(user));
          this.setupInactivityListeners();
          this.router.navigate(['/app/dashboard']);
        }
      }),
      finalize(() => this.loader.hide())
    );
  }

  logout() {
    this.http.post(`${this.baseUrl}/auth/logout`, {}).subscribe();
    this.userSignal.set(null);
    localStorage.removeItem('kallme_user');
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
}
