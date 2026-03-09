import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="h-full flex flex-col">
      <!-- Settings Header & Tabs -->
      <div class="bg-white dark:bg-[#1E293B] border-b border-slate-200 dark:border-white/5 px-6 pt-6 sticky top-0 z-10 overflow-x-auto custom-scrollbar">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-10 h-10 bg-[#FFC107]/20 rounded-xl flex items-center justify-center text-[#FFC107]">
            <mat-icon>settings</mat-icon>
          </div>
          <div>
            <h1 class="text-2xl font-display font-black text-[#1A1A1A] dark:text-white">Settings</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400">Configure system parameters and catalogs</p>
          </div>
        </div>

        <nav class="flex gap-6 min-w-max">
          <a 
            routerLink="general" 
            routerLinkActive="text-[#FFC107] border-b-2 border-[#FFC107]" 
            class="pb-3 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-[#1A1A1A] dark:hover:text-white transition-colors border-b-2 border-transparent"
          >
            General
          </a>
          <a 
            routerLink="hotel-management" 
            routerLinkActive="text-[#FFC107] border-b-2 border-[#FFC107]" 
            class="pb-3 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-[#1A1A1A] dark:hover:text-white transition-colors border-b-2 border-transparent"
          >
            Hotel Management
          </a>
          <a 
            routerLink="menu-bulk-add" 
            routerLinkActive="text-[#FFC107] border-b-2 border-[#FFC107]" 
            class="pb-3 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-[#1A1A1A] dark:hover:text-white transition-colors border-b-2 border-transparent"
          >
            Bulk Menu Import
          </a>
          <a 
            routerLink="merchant-menu-editor" 
            routerLinkActive="text-[#FFC107] border-b-2 border-[#FFC107]" 
            class="pb-3 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-[#1A1A1A] dark:hover:text-white transition-colors border-b-2 border-transparent"
          >
            Merchant Pricing
          </a>
        </nav>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-hidden">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Settings {}
