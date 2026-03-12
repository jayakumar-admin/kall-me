import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { LoaderService } from '../services/loader.service';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (loader.loading()) {
      <div class="fixed inset-0 z-[10000] flex items-center justify-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm transition-all duration-300">
        <div class="flex flex-col items-center">
          
          <!-- Animated Delivery Partner -->
          <div class="relative flex flex-col items-center justify-center">
            <!-- Wind/Speed lines -->
            <div class="absolute top-1/2 -left-8 w-6 h-1 bg-[#FFC107]/40 rounded-full animate-wind-1"></div>
            <div class="absolute top-1/3 -left-4 w-4 h-1 bg-[#FFC107]/40 rounded-full animate-wind-2"></div>
            <div class="absolute bottom-1/3 -left-6 w-8 h-1 bg-[#FFC107]/40 rounded-full animate-wind-3"></div>

            <!-- Scooter -->
            <div class="relative z-10 animate-drive text-[#FFC107] drop-shadow-lg">
              <mat-icon style="font-size: 80px; width: 80px; height: 80px;">delivery_dining</mat-icon>
            </div>
            
            <!-- Shadow -->
            <div class="w-16 h-2 bg-black/10 dark:bg-black/30 rounded-[100%] animate-shadow mt-2"></div>
          </div>

          <!-- Loading Text -->
          <div class="mt-8 flex flex-col items-center text-center">
            <h3 class="text-2xl font-display font-black text-slate-800 dark:text-white tracking-tight animate-pulse">
              {{ loader.message() || 'Loading...' }}
            </h3>
            <p class="text-sm text-slate-500 dark:text-slate-400 font-medium mt-2">
              Please wait a moment
            </p>
          </div>

        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes drive {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      50% { transform: translateY(-8px) rotate(-3deg); }
    }
    @keyframes shadow {
      0%, 100% { transform: scale(1); opacity: 0.4; }
      50% { transform: scale(0.7); opacity: 0.15; }
    }
    @keyframes wind {
      0% { transform: translateX(20px); opacity: 0; }
      20% { opacity: 1; }
      80% { opacity: 1; }
      100% { transform: translateX(-40px); opacity: 0; }
    }
    .animate-drive {
      animation: drive 0.5s infinite ease-in-out;
    }
    .animate-shadow {
      animation: shadow 0.5s infinite ease-in-out;
    }
    .animate-wind-1 {
      animation: wind 0.8s infinite linear;
    }
    .animate-wind-2 {
      animation: wind 0.6s infinite linear 0.2s;
    }
    .animate-wind-3 {
      animation: wind 1s infinite linear 0.4s;
    }
  `]
})
export class LoaderComponent {
  loader = inject(LoaderService);
}
