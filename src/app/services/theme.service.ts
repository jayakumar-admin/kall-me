// src/app/services/theme.service.ts
import { Injectable, signal, inject, PLATFORM_ID, RendererFactory2 } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private platformId = inject(PLATFORM_ID);
  private renderer = inject(RendererFactory2).createRenderer(null, null);
  darkMode = signal<boolean>(false);

  constructor() {
    console.log('ThemeService constructor');
    this.init();
  }

  init() {
    if (!isPlatformBrowser(this.platformId)) return;
    console.log('ThemeService init');
    const savedTheme = localStorage.getItem('kallme_theme');
    console.log('savedTheme:', savedTheme);
    if (savedTheme === 'dark') {
      this.setDarkMode(true);
    }
  }

  toggleDarkMode() {
    this.setDarkMode(!this.darkMode());
  }

  private setDarkMode(isDark: boolean) {
    this.darkMode.set(isDark);
    if (isPlatformBrowser(this.platformId)) {
      console.log('Setting dark mode:', isDark);
      localStorage.setItem('kallme_theme', isDark ? 'dark' : 'light');
      if (isDark) {
        this.renderer.addClass(document.documentElement, 'dark');
        this.renderer.addClass(document.body, 'dark');
        console.log('Added .dark class to html and body');
      } else {
        this.renderer.removeClass(document.documentElement, 'dark');
        this.renderer.removeClass(document.body, 'dark');
        console.log('Removed .dark class from html and body');
      }
    }
  }
}
