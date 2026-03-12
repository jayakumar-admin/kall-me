import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { finalize, tap, of, delay } from 'rxjs';
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

  constructor() {
    const savedUser = localStorage.getItem('kallme_user');
    if (savedUser) {
      this.userSignal.set(JSON.parse(savedUser));
    }
  }

  login(credentials: { email?: string | null; password?: string | null }) {
    this.loader.show('Authenticating...');
    return of({
      name: 'Admin User',
      email: credentials.email || 'admin@kallme.com',
      role: 'admin',
      token: 'mock-jwt-token-12345'
    }).pipe(
      delay(500),
      tap(user => {
        this.userSignal.set(user);
        localStorage.setItem('kallme_user', JSON.stringify(user));
        this.router.navigate(['/dashboard']);
      }),
      finalize(() => this.loader.hide())
    );
  }

  logout() {
    this.userSignal.set(null);
    localStorage.removeItem('kallme_user');
    this.router.navigate(['/login']);
  }
}
