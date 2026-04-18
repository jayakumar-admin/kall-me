import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-[#0F172A]">
      <!-- Settings Sidebar -->
      <div class="w-full md:w-64 bg-white dark:bg-[#1E293B] border-r border-slate-200 dark:border-white/5 flex flex-col shrink-0">
        <div class="p-6 border-b border-slate-200 dark:border-white/5">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-[#FFC107]/20 rounded-xl flex items-center justify-center text-[#FFC107]">
              <mat-icon>settings</mat-icon>
            </div>
            <div>
              <h1 class="text-xl font-display font-black text-[#1A1A1A] dark:text-white">Settings</h1>
              <p class="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Configuration</p>
            </div>
          </div>
        </div>

        <nav class="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
          <a 
            routerLink="general" 
            routerLinkActive="bg-[#FFC107]/10 text-[#FFC107] font-bold" 
            class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-[#1A1A1A] dark:hover:text-white transition-all"
          >
            <mat-icon class="text-[20px] w-5 h-5">tune</mat-icon>
            General
          </a>
          <a 
            routerLink="calculation-type" 
            routerLinkActive="bg-[#FFC107]/10 text-[#FFC107] font-bold" 
            class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-[#1A1A1A] dark:hover:text-white transition-all"
          >
            <mat-icon class="text-[20px] w-5 h-5">calculate</mat-icon>
            Calculation Type
          </a>
          <a 
            routerLink="commission-management" 
            routerLinkActive="bg-[#FFC107]/10 text-[#FFC107] font-bold" 
            class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-[#1A1A1A] dark:hover:text-white transition-all"
          >
            <mat-icon class="text-[20px] w-5 h-5">percent</mat-icon>
            Commission Management
          </a>
          <a 
            routerLink="delivery-logistics" 
            routerLinkActive="bg-[#FFC107]/10 text-[#FFC107] font-bold" 
            class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-[#1A1A1A] dark:hover:text-white transition-all"
          >
            <mat-icon class="text-[20px] w-5 h-5">local_shipping</mat-icon>
            Shipping Range Calculation
          </a>
          <a 
            routerLink="hotel-management" 
            routerLinkActive="bg-[#FFC107]/10 text-[#FFC107] font-bold" 
            class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-[#1A1A1A] dark:hover:text-white transition-all"
          >
            <mat-icon class="text-[20px] w-5 h-5">storefront</mat-icon>
            Hotel Management
          </a>
          <a 
            routerLink="menu-bulk-add" 
            routerLinkActive="bg-[#FFC107]/10 text-[#FFC107] font-bold" 
            class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-[#1A1A1A] dark:hover:text-white transition-all"
          >
            <mat-icon class="text-[20px] w-5 h-5">library_add</mat-icon>
            Bulk Menu Import
          </a>
          <a 
            routerLink="menu-editor" 
            routerLinkActive="bg-[#FFC107]/10 text-[#FFC107] font-bold" 
            class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-[#1A1A1A] dark:hover:text-white transition-all"
          >
            <mat-icon class="text-[20px] w-5 h-5">edit</mat-icon>
            Menu Editor
          </a>
          <a 
            routerLink="hotel-menu-editor" 
            routerLinkActive="bg-[#FFC107]/10 text-[#FFC107] font-bold" 
            class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-[#1A1A1A] dark:hover:text-white transition-all"
          >
            <mat-icon class="text-[20px] w-5 h-5">price_change</mat-icon>
            Hotel Pricing
          </a>
          <a 
            routerLink="whatsapp-logs" 
            routerLinkActive="bg-[#FFC107]/10 text-[#FFC107] font-bold" 
            class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-[#1A1A1A] dark:hover:text-white transition-all"
          >
            <mat-icon class="text-[20px] w-5 h-5">history</mat-icon>
            WhatsApp Logs
          </a>
          <a 
            routerLink="delivery-permissions" 
            routerLinkActive="bg-[#FFC107]/10 text-[#FFC107] font-bold" 
            class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-[#1A1A1A] dark:hover:text-white transition-all"
          >
            <mat-icon class="text-[20px] w-5 h-5">admin_panel_settings</mat-icon>
            Delivery Permissions
          </a>
          <a 
            routerLink="user-management" 
            routerLinkActive="bg-[#FFC107]/10 text-[#FFC107] font-bold" 
            class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-[#1A1A1A] dark:hover:text-white transition-all"
          >
            <mat-icon class="text-[20px] w-5 h-5">people</mat-icon>
            User Management
          </a>
          <a 
            routerLink="security" 
            routerLinkActive="bg-[#FFC107]/10 text-[#FFC107] font-bold" 
            class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-[#1A1A1A] dark:hover:text-white transition-all"
          >
            <mat-icon class="text-[20px] w-5 h-5">security</mat-icon>
            Security
          </a>
        </nav>
      </div>

      <!-- Content Area -->
      <div class="flex-1 overflow-y-auto bg-white dark:bg-[#0F172A] relative custom-scrollbar">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Settings {}
