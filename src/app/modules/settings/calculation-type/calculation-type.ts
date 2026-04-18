import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../../services/settings.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-calculation-type',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  template: `
    <div class="p-4 md:p-8 space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 class="text-2xl md:text-3xl font-display font-black text-[#1A1A1A] dark:text-white uppercase tracking-tight">Calculation Types</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">Configure global calculation methods for commissions and shipping.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Commission Calculation Type -->
        <div class="card space-y-6 border-none ring-1 ring-slate-100 dark:ring-white/5">
          <div class="flex items-center gap-2">
            <mat-icon class="text-[#FFC107]">percent</mat-icon>
            <h3 class="font-bold text-[#1A1A1A] dark:text-white">Admin Commission</h3>
          </div>
          
          <div>
            <label for="commissionCalcType" class="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wide">Commission Calculation Type</label>
            <select id="commissionCalcType" 
              [ngModel]="settingsService.settings().financial.commissionType" 
              (ngModelChange)="updateCommissionType($event)" 
              class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-xl p-3 text-sm text-[#1A1A1A] dark:text-white outline-none focus:ring-1 focus:ring-[#FFC107]">
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount (₹)</option>
            </select>
          </div>

          <p class="text-xs text-slate-500 italic">
            This setting determines the default calculation method for admin commissions when no specific range matches.
          </p>
        </div>

        <!-- Shipping Calculation Type -->
        <div class="card space-y-6 border-none ring-1 ring-slate-100 dark:ring-white/5">
          <div class="flex items-center gap-2">
            <mat-icon class="text-[#FFC107]">local_shipping</mat-icon>
            <h3 class="font-bold text-[#1A1A1A] dark:text-white">Shipping Charges</h3>
          </div>
          
          <div>
            <label for="shippingCalcType" class="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wide">Shipping Calculation Type</label>
            <select id="shippingCalcType" 
              [ngModel]="settingsService.settings().logistics.shippingType" 
              (ngModelChange)="updateShippingType($event)" 
              class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-xl p-3 text-sm text-[#1A1A1A] dark:text-white outline-none focus:ring-1 focus:ring-[#FFC107]">
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount (₹)</option>
            </select>
          </div>

          <p class="text-xs text-slate-500 italic">
            This setting determines the default calculation method for delivery fees when no specific range matches.
          </p>
        </div>
      </div>

      <div class="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/20">
        <div class="flex gap-3">
          <mat-icon class="text-amber-500">info</mat-icon>
          <p class="text-xs text-amber-700 dark:text-amber-400">
            <strong>Note:</strong> Individual ranges defined in "Commission Management" and "Shipping Range Calculation" can override these global types with their own specific calculation methods.
          </p>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalculationType {
  public settingsService = inject(SettingsService);
  private toast = inject(ToastService);

  updateCommissionType(type: 'percentage' | 'fixed') {
    const current = this.settingsService.settings();
    this.settingsService.updateSettings({
      ...current,
      financial: { ...current.financial, commissionType: type }
    });
    this.toast.success('Commission calculation type updated');
  }

  updateShippingType(type: 'percentage' | 'fixed') {
    const current = this.settingsService.settings();
    this.settingsService.updateSettings({
      ...current,
      logistics: { ...current.logistics, shippingType: type }
    });
    this.toast.success('Shipping calculation type updated');
  }
}
