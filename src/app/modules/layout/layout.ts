import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';
import { SearchService } from '../../services/search.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, MatIconModule],
  template: `
    <div class="flex h-screen bg-[#F8F9FA] dark:bg-[#0F172A] transition-colors duration-300 overflow-hidden relative">
      
      <!-- Mobile Overlay -->
      @if (isMobileMenuOpen()) {
        <div 
          (click)="isMobileMenuOpen.set(false)" 
          (keydown.enter)="isMobileMenuOpen.set(false)"
          role="button"
          tabindex="0"
          class="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm animate-in fade-in"
          aria-label="Close mobile menu"
        ></div>
      }

      <!-- Sidebar -->
      <aside 
        class="fixed md:relative inset-y-0 left-0 z-30 flex flex-col bg-white dark:bg-[#1E293B] border-r border-slate-200 dark:border-white/5 transition-all duration-300"
        [class.translate-x-0]="isMobileMenuOpen()"
        [class.-translate-x-full]="!isMobileMenuOpen()"
        [class.md:translate-x-0]="true"
        [class.w-64]="!isDesktopCollapsed()"
        [class.md:w-20]="isDesktopCollapsed()"
        [class.md:w-64]="!isDesktopCollapsed()"
      >
        <!-- Logo -->
        <div class="h-16 flex items-center gap-3 px-6 border-b border-slate-100 dark:border-white/5 whitespace-nowrap overflow-hidden">
          <div class="w-8 h-8 bg-[#FFC107] rounded-lg flex items-center justify-center shadow-sm shrink-0">
            <mat-icon class="text-black text-sm">delivery_dining</mat-icon>
          </div>
          <h1 
            class="font-display font-black text-xl tracking-tight text-[#1A1A1A] dark:text-white transition-opacity duration-300"
            [class.md:hidden]="isDesktopCollapsed()"
          >
            KALL ME
          </h1>
        </div>

        <!-- Nav Links -->
        <nav class="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar overflow-x-hidden">
          <ng-container *ngTemplateOutlet="navLink; context: { label: 'Dashboard', link: '/dashboard', icon: 'dashboard' }"></ng-container>
          <ng-container *ngTemplateOutlet="navLink; context: { label: 'Live Orders', link: '/orders', icon: 'list_alt' }"></ng-container>
          <ng-container *ngTemplateOutlet="navLink; context: { label: 'Create Order', link: '/create-order', icon: 'add_circle_outline' }"></ng-container>
          <ng-container *ngTemplateOutlet="navLink; context: { label: 'Reports', link: '/reports', icon: 'bar_chart' }"></ng-container>
          <ng-container *ngTemplateOutlet="navLink; context: { label: 'Settings', link: '/settings', icon: 'settings' }"></ng-container>
        </nav>

        <!-- User Profile (Bottom Sidebar) -->
        <div class="p-4 border-t border-slate-100 dark:border-white/5">
          <div class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer group">
            <div class="w-10 h-10 rounded-full bg-[#FFC107]/20 flex items-center justify-center text-[#FFC107] group-hover:bg-[#FFC107] group-hover:text-black transition-colors shrink-0">
              <mat-icon>person</mat-icon>
            </div>
            <div class="overflow-hidden" [class.md:hidden]="isDesktopCollapsed()">
              <p class="text-sm font-bold text-[#1A1A1A] dark:text-white truncate">Admin User</p>
              <p class="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-widest truncate">Super Admin</p>
            </div>
          </div>
        </div>

        <!-- Desktop Collapse Toggle -->
        <div class="hidden md:flex p-2 border-t border-slate-100 dark:border-white/5 justify-end">
          <button 
            (click)="toggleDesktopSidebar()" 
            class="w-full p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 flex items-center justify-center transition-colors"
          >
            <mat-icon>{{ isDesktopCollapsed() ? 'chevron_right' : 'chevron_left' }}</mat-icon>
          </button>
        </div>
      </aside>

      <!-- Main Content Wrapper -->
      <div class="flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300">
        <!-- Top Header -->
        <header class="h-16 bg-white/80 dark:bg-[#0F172A]/80 backdrop-blur border-b border-slate-200 dark:border-white/5 flex items-center justify-between px-4 md:px-6 z-10 transition-colors">
          
          <!-- Mobile Menu Toggle -->
          <button (click)="isMobileMenuOpen.set(true)" class="md:hidden p-2 -ml-2 mr-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg">
            <mat-icon>menu</mat-icon>
          </button>

          <!-- Search Bar -->
          <div class="flex-1 max-w-md">
            <div class="relative group">
              <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#FFC107] transition-colors">search</mat-icon>
              <input 
                type="text" 
                [value]="search.searchTerm()"
                (input)="onSearch($event)"
                placeholder="Search..." 
                class="w-full bg-[#F1F3F5] dark:bg-[#1E293B] border-none rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#1A1A1A] dark:text-white focus:ring-2 focus:ring-[#FFC107]/20 outline-none transition-all placeholder:text-slate-400"
              >
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 md:gap-4 pl-4">
            <button (click)="theme.toggleDarkMode()" class="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 transition-colors">
              <mat-icon>{{ theme.darkMode() ? 'light_mode' : 'dark_mode' }}</mat-icon>
            </button>
            <button class="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 transition-colors relative">
              <mat-icon>notifications</mat-icon>
              <span class="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-[#0F172A]"></span>
            </button>
          </div>
        </header>

        <!-- Main Content -->
        <main class="flex-1 overflow-hidden relative">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>

    <!-- Nav Link Template -->
    <ng-template #navLink let-label="label" let-link="link" let-icon="icon">
      <a 
        [routerLink]="link" 
        routerLinkActive="bg-[#FFC107]/10 text-[#FFC107]"
        [routerLinkActiveOptions]="{exact: true}"
        (click)="isMobileMenuOpen.set(false)"
        class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-[#1A1A1A] dark:hover:text-white transition-all group overflow-hidden whitespace-nowrap"
        [class.justify-center]="isDesktopCollapsed()"
        [class.px-2]="isDesktopCollapsed()"
      >
        <mat-icon class="transition-colors shrink-0" [class.text-[#FFC107]]="rla.isActive" #rla="routerLinkActive" [routerLinkActive]="['dummy']">{{ icon }}</mat-icon>
        <span [class.md:hidden]="isDesktopCollapsed()" class="transition-opacity duration-200">{{ label }}</span>
      </a>
    </ng-template>
  `,
  styles: [`
    :host { display: block; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Layout {
  theme = inject(ThemeService);
  auth = inject(AuthService);
  search = inject(SearchService);
  
  isMobileMenuOpen = signal(false);
  isDesktopCollapsed = signal(false);

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.search.setSearchTerm(input.value);
  }

  toggleDesktopSidebar() {
    this.isDesktopCollapsed.update(v => !v);
  }
}
