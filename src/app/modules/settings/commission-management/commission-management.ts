import { ChangeDetectionStrategy, Component, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../services/toast.service';
import { SettingsService } from '../../../services/settings.service';
import { CommissionRange } from '../../../models';

@Component({
  selector: 'app-commission-management',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  template: `
    <div class="p-4 md:p-8 space-y-8 max-w-4xl mx-auto">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl md:text-3xl font-display font-black text-[#1A1A1A] dark:text-white uppercase tracking-tight">Commission Management</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400">Configure admin commission based on delivery charges.</p>
        </div>
        <div class="flex gap-3 w-full sm:w-auto">
          <button (click)="discard()" class="flex-1 sm:flex-none px-6 py-2 rounded-xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 font-bold text-sm">Discard</button>
          <button (click)="save()" class="btn-primary flex-1 sm:flex-none">Save Changes</button>
        </div>
      </div>

      <div class="card space-y-6 border-none ring-1 ring-slate-100 dark:ring-white/5">
        <div class="flex items-center gap-2">
          <mat-icon class="text-[#FFC107]">percent</mat-icon>
          <h3 class="font-bold text-[#1A1A1A] dark:text-white">Delivery Charge Based Commission</h3>
        </div>

        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div class="text-xs font-bold text-slate-500 block mb-2">Commission Ranges</div>
            <button (click)="addRange()" class="text-xs font-bold text-[#FFC107] hover:text-[#FFA000] flex items-center gap-1">
              <mat-icon class="text-[16px] w-4 h-4">add</mat-icon> Add Range
            </button>
          </div>
          
          <div class="hidden sm:grid grid-cols-5 gap-4 mb-2 px-4 shadow-sm py-2 bg-slate-50 dark:bg-white/5 rounded-lg">
            <div class="text-[10px] font-bold text-slate-500 uppercase">Min DC (₹)</div>
            <div class="text-[10px] font-bold text-slate-500 uppercase">Max DC (₹)</div>
            <div class="text-[10px] font-bold text-slate-500 uppercase">Type</div>
            <div class="text-[10px] font-bold text-slate-500 uppercase">Commission</div>
            <div></div>
          </div>

          @for (range of ranges; track $index) {
            <div class="grid grid-cols-1 sm:grid-cols-5 gap-4 items-center bg-white dark:bg-[#1e293b]/50 p-4 rounded-xl border border-slate-100 dark:border-white/5 shadow-sm sm:shadow-none sm:p-0 sm:bg-transparent sm:border-none sm:dark:bg-transparent sm:dark:border-none">
              <div class="space-y-1 sm:space-y-0 text-left">
                <span class="sm:hidden text-[10px] font-bold text-slate-400 uppercase">Min DC (₹)</span>
                <input type="number" [(ngModel)]="range.min_range" placeholder="Min DC" class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-[#FFC107] dark:text-white">
              </div>
              <div class="space-y-1 sm:space-y-0 text-left">
                <span class="sm:hidden text-[10px] font-bold text-slate-400 uppercase">Max DC (₹)</span>
                <input type="number" [(ngModel)]="range.max_range" placeholder="Max DC" class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-[#FFC107] dark:text-white">
              </div>
              <div class="space-y-1 sm:space-y-0 text-left">
                <span class="sm:hidden text-[10px] font-bold text-slate-400 uppercase">Type</span>
                <select [(ngModel)]="range.calculation_type" class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#FFC107] dark:text-white">
                  <option value="fixed">Fixed (₹)</option>
                  <option value="percentage">Percent (%)</option>
                </select>
              </div>
              <div class="space-y-1 sm:space-y-0 text-left">
                <span class="sm:hidden text-[10px] font-bold text-slate-400 uppercase">Comm. ({{ range.calculation_type === 'percentage' ? '%' : '₹' }})</span>
                <div class="relative">
                  <span *ngIf="range.calculation_type === 'fixed'" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input type="number" [(ngModel)]="range.commission_percentage" 
                    [placeholder]="range.calculation_type === 'percentage' ? '%' : '₹'"
                    [class.pl-8]="range.calculation_type === 'fixed'"
                    class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg pr-4 py-2 text-sm outline-none focus:ring-1 focus:ring-[#FFC107] dark:text-white">
                  <span *ngIf="range.calculation_type === 'percentage'" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                </div>
              </div>
              <button (click)="removeRange($index)" class="text-red-500 hover:text-red-700 w-10 h-10 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          }
          
          @if (ranges.length === 0) {
            <div class="text-center py-8 text-slate-500 text-sm border border-dashed border-slate-200 dark:border-white/10 rounded-xl">
              No commission ranges configured. Click "Add Range" to create one.
            </div>
          }
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommissionManagement {
  public settingsService = inject(SettingsService);
  private toast = inject(ToastService);

  ranges: CommissionRange[] = [];

  constructor() {
    effect(() => {
      const currentRanges = this.settingsService.commissionRanges();
      // Deep copy to avoid mutating the signal directly
      this.ranges = JSON.parse(JSON.stringify(currentRanges));
    });
  }

  addRange() {
    const min = this.ranges.length > 0 ? Math.max(...this.ranges.map(r => r.max_range)) + 1 : 0;
    this.ranges.push({
      min_range: min,
      max_range: min + 100,
      commission_percentage: 5,
      calculation_type: 'percentage'
    });
  }

  removeRange(index: number) {
    this.ranges.splice(index, 1);
  }

  discard() {
    const currentRanges = this.settingsService.commissionRanges();
    this.ranges = JSON.parse(JSON.stringify(currentRanges));
    this.toast.show('Changes discarded', 'info');
  }

  save() {
    // Basic validation
    for (const range of this.ranges) {
      if (Number(range.min_range) >= Number(range.max_range)) {
        this.toast.show('Min range must be less than Max range', 'error');
        return;
      }
      if (range.commission_percentage < 0) {
        this.toast.show('Commission cannot be negative', 'error');
        return;
      }
    }

    this.settingsService.updateCommissionRanges(this.ranges);
  }
}
