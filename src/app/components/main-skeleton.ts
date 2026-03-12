import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-main-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex h-screen bg-[#F8F9FA] dark:bg-[#0F172A] overflow-hidden">
      <!-- Sidebar Skeleton -->
      <div class="w-64 bg-white dark:bg-[#1E293B] border-r border-slate-200 dark:border-white/5 flex flex-col p-4 space-y-6">
        <div class="h-8 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg mb-8"></div>
        <div class="space-y-4">
          @for (i of [1,2,3,4,5]; track i) {
            <div class="h-10 w-full bg-slate-100 dark:bg-slate-800/50 rounded-xl"></div>
          }
        </div>
        <div class="mt-auto pt-4 border-t border-slate-100 dark:border-white/5">
          <div class="h-12 w-full bg-slate-100 dark:bg-slate-800/50 rounded-xl"></div>
        </div>
      </div>

      <!-- Content Skeleton -->
      <div class="flex-1 flex flex-col">
        <!-- Header Skeleton -->
        <div class="h-16 bg-white dark:bg-[#0F172A] border-b border-slate-200 dark:border-white/5 flex items-center px-6 justify-between">
          <div class="h-10 w-64 bg-slate-100 dark:bg-slate-800/50 rounded-lg"></div>
          <div class="flex gap-4">
            <div class="h-10 w-10 bg-slate-100 dark:bg-slate-800/50 rounded-lg"></div>
            <div class="h-10 w-10 bg-slate-100 dark:bg-slate-800/50 rounded-lg"></div>
          </div>
        </div>

        <!-- Body Skeleton -->
        <div class="flex-1 p-6 space-y-8 overflow-hidden">
          <div class="flex justify-between items-end">
            <div class="space-y-2">
              <div class="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
              <div class="h-4 w-64 bg-slate-100 dark:bg-slate-800/50 rounded-lg"></div>
            </div>
            <div class="h-10 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
          </div>

          <!-- Stats Grid -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            @for (i of [1,2,3]; track i) {
              <div class="h-32 bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-100 dark:border-white/5 p-6 space-y-4">
                <div class="h-4 w-24 bg-slate-100 dark:bg-slate-800/50 rounded"></div>
                <div class="h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded"></div>
              </div>
            }
          </div>

          <!-- Table/List Skeleton -->
          <div class="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-100 dark:border-white/5 overflow-hidden">
            <div class="p-4 border-b border-slate-100 dark:border-white/5">
              <div class="h-6 w-32 bg-slate-100 dark:bg-slate-800/50 rounded"></div>
            </div>
            <div class="p-4 space-y-4">
              @for (i of [1,2,3,4,5]; track i) {
                <div class="h-12 w-full bg-slate-50 dark:bg-slate-800/30 rounded-lg"></div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class MainSkeletonComponent {}
