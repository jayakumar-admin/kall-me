import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

export interface User {
  name: string;
  email: string;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private router = inject(Router);
  private userSignal = signal<User | null>(null);
  user = computed(() => this.userSignal());
  isLoggedIn = computed(() => !!this.userSignal());

  constructor() {
    const savedUser = localStorage.getItem('kallme_user');
    if (savedUser) {
      this.userSignal.set(JSON.parse(savedUser));
    }
  }

  login(credentials: { email?: string | null; password?: string | null }) {
    // Mock login
    if (credentials.email === 'admin@kallme.com' && credentials.password === 'password123') {
      const userData: User = { name: 'Alex Morgan', email: credentials.email, role: 'admin' };
      this.userSignal.set(userData);
      localStorage.setItem('kallme_user', JSON.stringify(userData));
      this.router.navigate(['/dashboard']);
      return true;
    }
    return false;
  }

  logout() {
    this.userSignal.set(null);
    localStorage.removeItem('kallme_user');
    this.router.navigate(['/login']);
  }
}
