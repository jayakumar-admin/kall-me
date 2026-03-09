// src/app/services/theme.service.ts
import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  darkMode = signal<boolean>(false);

  constructor() {
    const savedTheme = localStorage.getItem('kallme_theme');
    if (savedTheme === 'dark') {
      this.setDarkMode(true);
    }
  }

  toggleDarkMode() {
    this.setDarkMode(!this.darkMode());
  }

  private setDarkMode(isDark: boolean) {
    this.darkMode.set(isDark);
    localStorage.setItem('kallme_theme', isDark ? 'dark' : 'light');
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}
