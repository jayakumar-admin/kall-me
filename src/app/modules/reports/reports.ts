import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit, effect, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ECharts, EChartsOption } from 'echarts';
import { NgxEchartsDirective } from 'ngx-echarts';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { Order, DeliveryPerson } from '../../models';
import { CatalogService } from '../../services/catalog.service';
import { SearchService } from '../../services/search.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ReportTabMeta {
  name: string;
  category: 'Financial' | 'Operations' | 'Analytics' | 'Menu & Sales';
  badge: string;
  icon: string;
  shortDescription: string;
  purpose: string;
  metrics: string[];
  businessValue: string;
}

export interface ReportSubTabMeta {
  name: string;
  icon: string;
  description: string;
  purpose: string;
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, NgxEchartsDirective],
  template: `
    <div class="h-full overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-6 sm:space-y-8">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div class="space-y-1">
          <h1 class="text-2xl sm:text-3xl font-display font-black text-[#1A1A1A] dark:text-white uppercase tracking-tight">Reports & Analytics</h1>
          <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Track and analyze business performance metrics.</p>
        </div>
        <div class="flex flex-wrap gap-2 sm:gap-3">
          <button (click)="exportCSV()" class="flex-1 sm:flex-none px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-400 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
            <mat-icon class="text-lg">table_view</mat-icon>
            Export CSV
          </button>
          <button (click)="exportPDF()" class="flex-1 sm:flex-none px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-400 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
            <mat-icon class="text-lg">picture_as_pdf</mat-icon>
            Export PDF
          </button>
        </div>
      </div>

      <!-- Tabs - Mobile horizontal scrollable -->
      <div class="space-y-4">
        <div class="flex flex-col gap-3 border-b border-slate-200 dark:border-white/10">
          <div class="flex overflow-x-auto no-scrollbar -mb-px">
            @for (tab of tabs; track tab) {
              <button (click)="currentTab.set(tab)" 
                (mouseenter)="showTabTooltip(tab, $event)"
                (mouseleave)="hideTabTooltip()"
                (focus)="showTabTooltip(tab, $event)"
                (blur)="hideTabTooltip()"
                [class.border-[#FFC107]]="currentTab() === tab" 
                class="px-4 py-3 border-b-2 font-bold text-xs sm:text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer" 
                [class.text-[#FFC107]]="currentTab() === tab" 
                [class.text-slate-500]="currentTab() !== tab"
                [class.hover:text-[#1A1A1A]]="currentTab() !== tab"
                [class.dark:hover:text-white]="currentTab() !== tab">
                {{ tab }}
              </button>
            }
          </div>
          <div class="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            @for (sub of subTabs; track sub) {
              <button (click)="currentSubTab.set(sub)" 
                (mouseenter)="showSubTabTooltip(sub, $event)"
                (mouseleave)="hideTabTooltip()"
                (focus)="showSubTabTooltip(sub, $event)"
                (blur)="hideTabTooltip()"
                [class.bg-[#FFC107]]="currentSubTab() === sub" 
                class="px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-colors shrink-0 cursor-pointer" 
                [class.text-black]="currentSubTab() === sub" 
                [class.text-slate-500]="currentSubTab() !== sub"
                [class.bg-slate-100]="currentSubTab() !== sub"
                [class.dark:bg-white/5]="currentSubTab() !== sub">
                {{ sub }}
              </button>
            }
          </div>
        </div>

        <!-- Active Tab Context Card -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-50 to-indigo-50/30 dark:from-amber-500/10 dark:via-[#1E293B]/70 dark:to-indigo-950/20 border border-slate-200/80 dark:border-white/5 shadow-xs">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-xl bg-[#FFC107]/20 text-[#D99B00] dark:text-[#FFC107] flex items-center justify-center shrink-0">
              <mat-icon class="text-base">{{ currentTabInfo().icon }}</mat-icon>
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-black text-xs sm:text-sm text-[#1A1A1A] dark:text-white uppercase tracking-tight">
                  {{ currentTabInfo().name }}
                </span>
                <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-white dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-white/10">
                  {{ currentTabInfo().badge }}
                </span>
                <span class="text-[10px] font-bold text-slate-400">({{ currentTabInfo().category }})</span>
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                <span class="font-bold text-slate-700 dark:text-slate-300">Data Purpose:</span> {{ currentTabInfo().purpose }}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-1.5 flex-wrap shrink-0">
            <span class="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-1 hidden lg:inline">Metrics:</span>
            @for (metric of currentTabInfo().metrics; track metric) {
              <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 shadow-2xs">
                {{ metric }}
              </span>
            }
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="card border-none ring-1 ring-slate-100 dark:ring-white/5 p-4 sm:p-6">
        <div class="flex items-center justify-between gap-2 mb-6">
          <div class="flex items-center gap-2">
            <mat-icon class="text-[#FFC107]">filter_list</mat-icon>
            <h3 class="font-black text-sm sm:text-base text-[#1A1A1A] dark:text-white uppercase tracking-tight">Active Filters</h3>
          </div>
          <button (click)="resetFilters()" class="text-[10px] font-black uppercase tracking-widest text-[#FFC107] hover:text-[#E6AE06] transition-colors flex items-center gap-1">
            <mat-icon class="text-sm">restart_alt</mat-icon>
            Reset
          </button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div class="space-y-1">
            <label for="startDate" class="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Start Date</label>
            <input id="startDate" type="date" [ngModel]="startDate()" (ngModelChange)="startDate.set($event)" class="w-full bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-white/10 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500">
          </div>
          <div class="space-y-1">
            <label for="endDate" class="text-[10px] font-black text-slate-400 uppercase tracking-widest block">End Date</label>
            <input id="endDate" type="date" [ngModel]="endDate()" (ngModelChange)="endDate.set($event)" class="w-full bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-white/10 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500">
          </div>
          <div class="space-y-1">
            <label for="statusFilter" class="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Status</label>
            <select id="statusFilter" [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)" class="w-full bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-white/10 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-no-repeat bg-[right_0.5rem_center] bg-[length:1em_1em]">
              <option value="all">All Statuses</option>
              <option value="Delivered">Delivered</option>
              <option value="Live">Live</option>
              <option value="In Transit">In Transit</option>
              <option value="Order Placed">Order Placed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div class="space-y-1">
            <label for="hotelFilter" class="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Hotel</label>
            <select id="hotelFilter" [ngModel]="hotelFilter()" (ngModelChange)="hotelFilter.set($event)" class="w-full bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-white/10 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-no-repeat bg-[right_0.5rem_center] bg-[length:1em_1em]">
              <option value="all">All Hotels</option>
              @for (hotel of uniqueHotels(); track hotel.id) {
                <option [value]="hotel.id">{{ hotel.name }}</option>
              }
            </select>
          </div>
          <div class="space-y-1">
            <label for="deliveryFilter" class="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Delivery Partner</label>
            <select id="deliveryFilter" [ngModel]="deliveryFilter()" (ngModelChange)="deliveryFilter.set($event)" class="w-full bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-white/10 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-no-repeat bg-[right_0.5rem_center] bg-[length:1em_1em]">
              <option value="all">All Delivery Partners</option>
              @for (dp of drivers(); track dp.id) {
                <option [value]="dp.id">{{ dp.name }}</option>
              }
            </select>
          </div>
        </div>
      </div>

      <!-- Metrics -->
      @if (loading()) {
        <div class="py-12 text-center text-slate-500 flex flex-col items-center">
          <mat-icon class="animate-spin text-4xl mb-2">refresh</mat-icon>
          <p>Loading reports...</p>
        </div>
      } @else if (orders().length === 0) {
        <div class="py-12 text-center text-slate-500 flex flex-col items-center">
          <mat-icon class="text-4xl mb-4 opacity-50">search_off</mat-icon>
          <p>No orders found.</p>
        </div>
      } @else {
        @if (currentTab() === 'Master Chart View') {
          <div class="flex justify-end mb-4">
            <select [ngModel]="chartType()" (ngModelChange)="chartType.set($event)" class="input-field py-1 px-2 text-xs appearance-none w-32">
              <option value="bar">Bar Chart</option>
              <option value="line">Line Chart</option>
              <option value="pie">Pie Chart</option>
              <option value="area">Area Chart</option>
              <option value="scatter">Scatter Chart</option>
              <option value="doughnut">Doughnut Chart</option>
            </select>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="card border-none ring-1 ring-slate-100 dark:ring-white/5">
              <h3 class="font-bold text-[#1A1A1A] dark:text-white mb-4">Overview Analytics</h3>
              <div echarts [options]="getChartOptions('Overview')" class="h-80"></div>
            </div>
            <div class="card border-none ring-1 ring-slate-100 dark:ring-white/5">
              <h3 class="font-bold text-[#1A1A1A] dark:text-white mb-4">Hotel-wise Analytics</h3>
              <div echarts [options]="getChartOptions('Hotel-wise')" class="h-80"></div>
            </div>
            <div class="card border-none ring-1 ring-slate-100 dark:ring-white/5">
              <h3 class="font-bold text-[#1A1A1A] dark:text-white mb-4">Delivery Person-wise Analytics</h3>
              <div echarts [options]="getChartOptions('Delivery Man-wise')" class="h-80"></div>
            </div>
            <div class="card border-none ring-1 ring-slate-100 dark:ring-white/5">
              <h3 class="font-bold text-[#1A1A1A] dark:text-white mb-4">Menu-wise Analytics</h3>
              <div echarts [options]="getChartOptions('Menu-wise')" class="h-80"></div>
            </div>
            <div class="card border-none ring-1 ring-slate-100 dark:ring-white/5">
              <h3 class="font-bold text-[#1A1A1A] dark:text-white mb-4">Orders Analytics</h3>
              <div echarts [options]="getChartOptions('Orders')" class="h-80"></div>
            </div>
            <div class="card border-none ring-1 ring-slate-100 dark:ring-white/5">
              <h3 class="font-bold text-[#1A1A1A] dark:text-white mb-4">Commission / Earnings Analytics</h3>
              <div echarts [options]="getChartOptions('Commission / Earnings')" class="h-80"></div>
            </div>
            <div class="card border-none ring-1 ring-slate-100 dark:ring-white/5">
              <h3 class="font-bold text-[#1A1A1A] dark:text-white mb-4">Top Performing Hotels</h3>
              <div echarts [options]="getChartOptions('Top Performing Hotels')" class="h-80"></div>
            </div>
            <div class="card border-none ring-1 ring-slate-100 dark:ring-white/5">
              <h3 class="font-bold text-[#1A1A1A] dark:text-white mb-4">Top Selling Menus</h3>
              <div echarts [options]="getChartOptions('Top Selling Menus')" class="h-80"></div>
            </div>
            <div class="card border-none ring-1 ring-slate-100 dark:ring-white/5">
              <h3 class="font-bold text-[#1A1A1A] dark:text-white mb-4">Time-of-Day Analytics</h3>
              <div echarts [options]="getChartOptions('Time-of-Day')" class="h-80"></div>
            </div>
            <div class="card border-none ring-1 ring-slate-100 dark:ring-white/5">
              <h3 class="font-bold text-[#1A1A1A] dark:text-white mb-4">Status-wise Analytics</h3>
              <div echarts [options]="getChartOptions('Status-wise')" class="h-80"></div>
            </div>
            <div class="card border-none ring-1 ring-slate-100 dark:ring-white/5">
              <h3 class="font-bold text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
                <mat-icon class="text-lg">cancel</mat-icon> Cancelled Orders & Lost Revenue
              </h3>
              <div echarts [options]="getChartOptions('Cancelled Orders')" class="h-80"></div>
            </div>
          </div>
        } @else {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (item of metrics().items; track item.label) {
              <div class="card border-none ring-1 ring-slate-100 dark:ring-white/5 p-4 sm:p-5">
                <p class="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{{ item.label }}</p>
                <p class="text-lg sm:text-2xl font-black text-[#1A1A1A] dark:text-white leading-tight">{{ item.value }}</p>
              </div>
            }
          </div>
          
          @if (currentSubTab() === 'Chart') {
            <!-- Charts -->
            <div class="card border-none ring-1 ring-slate-100 dark:ring-white/5">
              <div class="flex justify-between items-center mb-4">
                <h3 class="font-bold text-[#1A1A1A] dark:text-white">{{ currentTab() }} Analytics</h3>
                <div class="flex gap-2">
                  <select [ngModel]="chartType()" (ngModelChange)="chartType.set($event)" class="input-field py-1 px-2 text-xs appearance-none">
                    <option value="bar">Bar Chart</option>
                    <option value="line">Line Chart</option>
                    <option value="pie">Pie Chart</option>
                    <option value="area">Area Chart</option>
                    <option value="scatter">Scatter Chart</option>
                    <option value="doughnut">Doughnut Chart</option>
                  </select>
                  <button (click)="downloadChart()" class="text-xs font-bold text-[#FFC107] hover:text-[#E6AE06] transition-colors flex items-center gap-1">
                    <mat-icon class="text-sm">download</mat-icon>
                    Download Chart
                  </button>
                </div>
              </div>
              <div echarts [options]="chartOptions()" class="h-80" (chartInit)="onChartInit($event)"></div>
            </div>
          } @else {
            <!-- Filtered Data Table -->
            <div class="card border-none ring-1 ring-slate-100 dark:ring-white/5 !p-0 overflow-hidden">
              <div class="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-white/5">
                <h3 class="font-bold text-[#1A1A1A] dark:text-white">{{ currentTab() }} Data</h3>
                <span class="text-xs font-bold text-slate-500 bg-white dark:bg-[#1E293B] px-2 py-1 rounded-md border border-slate-200 dark:border-white/10">
                  @if (currentTab() === 'Cancelled Orders') {
                    {{ cancelledFilteredOrders().length }} Cancelled Orders (₹{{ totalLostRevenue().toLocaleString() }} Lost)
                  } @else {
                    {{ validFilteredOrders().length }} Completed Orders (Excludes {{ cancelledFilteredOrders().length }} Cancelled)
                  }
                </span>
              </div>
              <div class="overflow-x-auto custom-scrollbar">
                @if (currentTab() === 'Payment Sheet') {
                  <table class="w-full text-left border-collapse min-w-max">
                    <thead>
                      <tr class="bg-indigo-50 dark:bg-indigo-900/40 border-b border-slate-100 dark:border-white/5 sticky top-0 z-20">
                        @for (header of tableConfig().headers; track header; let i = $index) {
                          <th 
                            class="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider whitespace-nowrap"
                            [class.sticky]="i < 2 || i === tableConfig().headers.length - 1"
                            [class.left-0]="i === 0"
                            [class.left-16]="i === 1"
                            [class.right-0]="i === tableConfig().headers.length - 1"
                            [class.bg-indigo-50]="i < 2 || i === tableConfig().headers.length - 1"
                            [class.dark:bg-[#1E293B]]="i < 2 || i === tableConfig().headers.length - 1"
                            [class.z-30]="i < 2 || i === tableConfig().headers.length - 1"
                            [class.text-right]="i >= 2"
                            [class.border-r]="i === 1"
                            [class.border-l]="i === tableConfig().headers.length - 1"
                            [class.border-slate-200]="i === 1 || i === tableConfig().headers.length - 1"
                            [class.shadow-[2px_0_5px_rgb(0,0,0,0.05)]]="i === 1"
                            [class.shadow-[-2px_0_5px_rgb(0,0,0,0.05)]]="i === tableConfig().headers.length - 1"
                          >
                            {{ header }}
                          </th>
                        }
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-white/5 bg-white dark:bg-[#1E293B]">
                      @for (row of tableConfig().rows; track row; let rowIndex = $index) {
                        <tr 
                          class="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group"
                          [class.bg-indigo-50/30]="row[1] === 'GRAND TOTAL'"
                          [class.dark:bg-indigo-900/10]="row[1] === 'GRAND TOTAL'"
                        >
                          @for (cell of row; track cell; let i = $index) {
                            <td 
                              class="px-4 py-3 text-sm font-bold text-[#1A1A1A] dark:text-white whitespace-nowrap"
                              [class.sticky]="i < 2 || i === row.length - 1"
                              [class.left-0]="i === 0"
                              [class.left-16]="i === 1"
                              [class.right-0]="i === row.length - 1"
                              [class.bg-white]="(i < 2 || i === row.length - 1) && row[1] !== 'GRAND TOTAL'"
                              [class.dark:bg-[#1E293B]]="(i < 2 || i === row.length - 1) && row[1] !== 'GRAND TOTAL'"
                              [class.bg-indigo-50]="(i < 2 || i === row.length - 1) && row[1] === 'GRAND TOTAL'"
                              [class.dark:bg-indigo-900]="(i < 2 || i === row.length - 1) && row[1] === 'GRAND TOTAL'"
                              [class.group-hover:bg-slate-50]="(i < 2 || i === row.length - 1) && row[1] !== 'GRAND TOTAL'"
                              [class.dark:group-hover:bg-white/5]="(i < 2 || i === row.length - 1) && row[1] !== 'GRAND TOTAL'"
                              [class.z-10]="i < 2 || i === row.length - 1"
                              [class.text-right]="i >= 2"
                              [class.text-indigo-600]="i === row.length - 1"
                              [class.dark:text-indigo-400]="i === row.length - 1"
                              [class.border-r]="i === 1"
                              [class.border-l]="i === row.length - 1"
                              [class.border-slate-100]="i === 1 || i === row.length - 1"
                              [class.shadow-[2px_0_5px_rgb(0,0,0,0.05)]]="i === 1"
                              [class.shadow-[-2px_0_5px_rgb(0,0,0,0.05)]]="i === row.length - 1"
                              [class.font-black]="row[1] === 'GRAND TOTAL' || i === row.length - 1"
                            >
                              {{ cell }}
                            </td>
                          }
                        </tr>
                      }
                    </tbody>
                  </table>
                } @else {
                  <table class="w-full text-left border-collapse">
                    <thead>
                      <tr [class]="tableConfig().headerColor" class="border-b border-slate-100 dark:border-white/5">
                        @for (header of tableConfig().headers; track header) {
                          <th class="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider" [class.text-right]="header === 'Amount' || header === 'Earnings' || header === 'Revenue'">{{ header }}</th>
                        }
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-white/5 bg-white dark:bg-[#1E293B]">
                      @for (row of tableConfig().rows; track row) {
                        <tr class="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                          @for (cell of row; track cell; let i = $index) {
                            <td class="px-4 py-3 text-sm font-bold text-[#1A1A1A] dark:text-white" [class.text-right]="i >= 1 && (cell.toString().startsWith('₹') || tableConfig().headers[i] === 'Orders' || tableConfig().headers[i] === 'Quantity')">{{ cell }}</td>
                          }
                        </tr>
                      }
                      @if (tableConfig().rows.length === 0) {
                        <tr>
                          <td [attr.colspan]="tableConfig().headers.length" class="px-4 py-8 text-center text-slate-500 dark:text-slate-400 text-sm">No records match the selected filters.</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                }
              </div>
            </div>
          }
        }
      }
      <!-- Floating Hover Popover for Tab Info -->
      @if (hoveredTabInfo(); as info) {
        <div 
          class="fixed z-50 pointer-events-none transition-all duration-150 ease-out"
          [style.top]="tooltipPosition().top"
          [style.left]="tooltipPosition().left"
          style="width: 360px; max-width: calc(100vw - 32px);"
        >
          <div class="relative bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 rounded-2xl shadow-2xl shadow-black/25 p-4 space-y-3 text-left animate-in fade-in zoom-in-95 duration-150">
            
            <!-- Top Arrow pointer -->
            <div 
              class="absolute -top-1.5 w-3 h-3 bg-white dark:bg-[#0F172A] border-t border-l border-slate-200/90 dark:border-white/10 rotate-45 transform"
              [style.left]="tooltipPosition().arrowLeft"
            ></div>

            <!-- Header with Icon & Category Badge -->
            <div class="flex items-start justify-between gap-2 relative z-10">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-xl bg-[#FFC107]/20 text-[#D99B00] dark:text-[#FFC107] flex items-center justify-center shrink-0 shadow-inner">
                  <mat-icon class="text-lg">{{ info.icon }}</mat-icon>
                </div>
                <div>
                  <h4 class="font-black text-sm text-[#1A1A1A] dark:text-white tracking-tight">
                    {{ info.name }}
                  </h4>
                  <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{{ info.category }}</span>
                </div>
              </div>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                [ngClass]="{
                  'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300': info.category === 'Financial',
                  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300': info.category === 'Operations',
                  'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300': info.category === 'Analytics',
                  'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300': info.category === 'Menu & Sales'
                }">
                {{ info.badge }}
              </span>
            </div>

            <!-- Purpose Section -->
            <div class="space-y-1 relative z-10">
              <div class="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#FFC107]">
                <mat-icon class="text-xs">help_outline</mat-icon>
                <span>Data Purpose</span>
              </div>
              <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                {{ info.purpose }}
              </p>
            </div>

            <!-- Key Data Metrics -->
            <div class="space-y-1.5 pt-1.5 border-t border-slate-100 dark:border-white/5 relative z-10">
              <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Data Displayed</p>
              <div class="flex flex-wrap gap-1">
                @for (metric of info.metrics; track metric) {
                  <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-white/5">
                    {{ metric }}
                  </span>
                }
              </div>
            </div>

            <!-- Business Value / Action -->
            <div class="bg-amber-500/10 dark:bg-[#FFC107]/10 rounded-xl p-2.5 flex items-start gap-2 border border-[#FFC107]/20 relative z-10">
              <mat-icon class="text-xs text-[#FFC107] shrink-0 mt-0.5">tips_and_updates</mat-icon>
              <p class="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">
                <span class="font-bold text-[#1A1A1A] dark:text-white">Business Value:</span> {{ info.businessValue }}
              </p>
            </div>
          </div>
        </div>
      }

      <!-- Floating Hover Popover for SubTab Info (Chart / Table) -->
      @if (hoveredSubTabInfo(); as subInfo) {
        <div 
          class="fixed z-50 pointer-events-none transition-all duration-150 ease-out"
          [style.top]="tooltipPosition().top"
          [style.left]="tooltipPosition().left"
          style="width: 290px; max-width: calc(100vw - 32px);"
        >
          <div class="relative bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 rounded-2xl shadow-2xl shadow-black/25 p-3.5 space-y-2 text-left animate-in fade-in zoom-in-95 duration-150">
            <div 
              class="absolute -top-1.5 w-3 h-3 bg-white dark:bg-[#0F172A] border-t border-l border-slate-200/90 dark:border-white/10 rotate-45 transform"
              [style.left]="tooltipPosition().arrowLeft"
            ></div>
            <div class="flex items-center gap-2 relative z-10">
              <div class="w-6 h-6 rounded-lg bg-[#FFC107]/20 text-[#FFC107] flex items-center justify-center shrink-0">
                <mat-icon class="text-sm">{{ subInfo.icon }}</mat-icon>
              </div>
              <div>
                <h4 class="font-black text-xs text-[#1A1A1A] dark:text-white uppercase tracking-wider">
                  {{ subInfo.name }}
                </h4>
                <p class="text-[10px] text-slate-400 font-medium">{{ subInfo.description }}</p>
              </div>
            </div>
            <p class="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium relative z-10 pt-1 border-t border-slate-100 dark:border-white/5">
              {{ subInfo.purpose }}
            </p>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Reports implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private catalog = inject(CatalogService);
  private route = inject(ActivatedRoute);
  search = inject(SearchService);
  
  orders = signal<Order[]>([]);
  drivers = signal<DeliveryPerson[]>([]);
  loading = signal(true);
   // Tabs
  tabs = [
    'Overview', 
    'Payment Sheet',
    'Cancelled Orders',
    'Master Chart View',
    'Hotel-wise', 
    'Delivery Person-wise', 
    'Monthly Salary', 
    'Menu-wise', 
    'Orders', 
    'Commission / Earnings', 
    'Top Performing Hotels', 
    'Top Selling Menus',
    'Time-of-Day',
    'Status-wise'
  ];
  currentTab = signal('Overview');
  subTabs = ['Chart', 'Table'];
  currentSubTab = signal('Table');
  chartType = signal<'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'doughnut'>('bar');

  // Tab Information Metadata
  tabMetaMap: Record<string, ReportTabMeta> = {
    'Overview': {
      name: 'Overview',
      category: 'Financial',
      badge: 'Platform Summary',
      icon: 'dashboard',
      shortDescription: 'High-level executive financial summary of platform distributions.',
      purpose: 'Summarizes real net revenue distribution across merchant hotel payouts, delivery rider salaries, and net platform admin commission (excluding cancelled orders).',
      metrics: ['Real Net Revenue', 'Hotel Earnings (Subtotal)', 'Delivery Salary (DC - Commission)', 'Admin Commission Retained', 'Revenue Lost (Cancelled)'],
      businessValue: 'Provides an instant health check on financial splits, real platform revenue, and cancellation loss.'
    },
    'Payment Sheet': {
      name: 'Payment Sheet',
      category: 'Financial',
      badge: 'Daily Settlement',
      icon: 'table_chart',
      shortDescription: 'Cross-tabulated date-by-date food sales per hotel partner (excluding cancelled orders).',
      purpose: 'Tracks daily order values generated for each restaurant to calculate vendor billings, payout schedules, and daily merchant settlements without cancelled orders.',
      metrics: ['Calendar Date', 'Hotel-by-Hotel Daily Subtotal', 'Daily Aggregate Revenue', 'Grand Total Settlement'],
      businessValue: 'Used by accountants and managers for partner reconciliation and vendor invoice processing.'
    },
    'Cancelled Orders': {
      name: 'Cancelled Orders & Revenue Loss',
      category: 'Financial',
      badge: 'Revenue Leakage',
      icon: 'cancel',
      shortDescription: 'Audit trail of cancelled orders and lost revenue value.',
      purpose: 'Lists all cancelled orders with restaurant, customer, address, and total amount, quantifying total revenue lost to eliminate operational leakage.',
      metrics: ['Cancelled Orders Count', 'Total Lost Revenue', 'Average Lost Ticket', 'Cancellation Rate (%)'],
      businessValue: 'Quantifies revenue leakage to minimize cancellations and optimize fulfillment pipelines.'
    },
    'Master Chart View': {
      name: 'Master Chart View',
      category: 'Analytics',
      badge: 'Multi-Chart Cockpit',
      icon: 'insights',
      shortDescription: 'Comprehensive side-by-side visual dashboard across all report dimensions.',
      purpose: 'Renders 10 analytical charts simultaneously (Overview, Hotels, Delivery, Menus, Hours, Statuses) with interchangeable chart types (Bar, Line, Pie, Area, etc.).',
      metrics: ['Multi-Dimensional Visual Trends', 'Interactive Chart Formats', 'Distribution Ratios'],
      businessValue: 'Enables management to spot cross-functional trends, bottlenecks, and anomalies at a glance.'
    },
    'Hotel-wise': {
      name: 'Hotel-wise',
      category: 'Operations',
      badge: 'Merchant Performance',
      icon: 'storefront',
      shortDescription: 'Order volumes, gross revenue, and average ticket size per hotel partner.',
      purpose: 'Measures sales performance for each restaurant partner to identify top revenue generators and examine order volume trends.',
      metrics: ['Total Orders', 'Gross Revenue', 'Average Order Value (AOV)'],
      businessValue: 'Guides merchant partnership tiering, commission structuring, and targeted restaurant support.'
    },
    'Delivery Person-wise': {
      name: 'Delivery Person-wise',
      category: 'Operations',
      badge: 'Rider Performance',
      icon: 'two_wheeler',
      shortDescription: 'Deliveries completed, net driver earnings, and cash collected per driver.',
      purpose: 'Evaluates delivery partner productivity, tracks net compensation (Delivery Fee minus Admin Commission), and monitors cash collected on delivery.',
      metrics: ['Completed Trips', 'Net Delivery Earnings', 'Advance / Cash Collected'],
      businessValue: 'Ensures equitable order dispatching, driver performance auditing, and daily cash-in-hand reconciliation.'
    },
    'Monthly Salary': {
      name: 'Monthly Salary',
      category: 'Financial',
      badge: 'Payroll Reconciliation',
      icon: 'account_balance_wallet',
      shortDescription: 'Monthly delivery earnings, trip counts, and advance deductions per rider.',
      purpose: 'Aggregates monthly delivery driver earnings alongside advances/cash collected to prepare accurate driver payroll payouts.',
      metrics: ['Billing Month & Year', 'Driver Name', 'Trip Volume', 'Gross Delivery Earnings', 'Advance Deductible'],
      businessValue: 'Automates monthly driver payroll calculation and prevents cash collection leakage or overpayment.'
    },
    'Menu-wise': {
      name: 'Menu-wise',
      category: 'Menu & Sales',
      badge: 'Item Velocity',
      icon: 'restaurant_menu',
      shortDescription: 'Sales volume and revenue generated by each dish in the catalog.',
      purpose: 'Analyzes item-level sales velocity and revenue contribution to identify top-selling menu items and low-performing dishes.',
      metrics: ['Menu Item Name', 'Quantity Sold (Units)', 'Gross Sales Revenue'],
      businessValue: 'Assists restaurants with inventory purchasing, kitchen prep planning, and menu optimization.'
    },
    'Orders': {
      name: 'Orders',
      category: 'Operations',
      badge: 'Transaction Ledger',
      icon: 'receipt_long',
      shortDescription: 'Chronological transaction register of individual customer orders.',
      purpose: 'Provides a searchable, granular audit trail of every placed order with timestamps, destinations, fulfillment states, and billing totals.',
      metrics: ['Order ID', 'Order Timestamp', 'Hotel Name', 'Delivery Address', 'Fulfillment Status', 'Grand Total'],
      businessValue: 'Frontline audit tool for investigating customer disputes, verifying delivery SLA, and resolving order queries.'
    },
    'Commission / Earnings': {
      name: 'Commission / Earnings',
      category: 'Financial',
      badge: 'Platform Profit',
      icon: 'monetization_on',
      shortDescription: 'Delivery charges (DC) collected vs. Admin Commission retained.',
      purpose: 'Audits platform revenue margins by detailing delivery fees charged, applied commission percentages, and platform profit retention.',
      metrics: ['Total Delivery Charges (DC)', 'Commission % Applied', 'Admin Commission Retained', 'Net Driver Payout'],
      businessValue: 'Validates take-rate margins and ensures delivery charge structures adequately cover operational costs.'
    },
    'Top Performing Hotels': {
      name: 'Top Performing Hotels',
      category: 'Analytics',
      badge: 'Top 5 Venues',
      icon: 'workspace_premium',
      shortDescription: 'Ranked leaderboard of the top 5 highest-grossing restaurant partners.',
      purpose: 'Highlights premier restaurant partners contributing the highest sales volume across the platform during the filtered period.',
      metrics: ['Hotel Rank', 'Hotel Name', 'Cumulative Gross Revenue'],
      businessValue: 'Identifies anchor partners for co-marketing campaigns, priority dispatch, and partnership renewals.'
    },
    'Top Selling Menus': {
      name: 'Top Selling Menus',
      category: 'Menu & Sales',
      badge: 'Top 5 Dishes',
      icon: 'local_fire_department',
      shortDescription: 'Leaderboard of the top 5 most frequently ordered menu items.',
      purpose: 'Pinpoints customer favorite dishes and viral food items ordered in highest volume across all partner restaurants.',
      metrics: ['Item Rank', 'Dish Name', 'Units Sold (Volume)'],
      businessValue: 'Drives promotional banner placement, meal combo creation, and supplier demand forecasting.'
    },
    'Time-of-Day': {
      name: 'Time-of-Day',
      category: 'Analytics',
      badge: 'Peak Rush Hours',
      icon: 'schedule',
      shortDescription: 'Hourly order volume distribution throughout the 24-hour cycle.',
      purpose: 'Identifies peak ordering windows (e.g., lunch rush 12:00–14:00, dinner rush 19:00–22:00) and off-peak lull periods.',
      metrics: ['Hourly Time Window', 'Order Frequency & Volume'],
      businessValue: 'Guides fleet shift scheduling, active driver staffing, and optimal timing for promotional push alerts.'
    },
    'Status-wise': {
      name: 'Status-wise',
      category: 'Operations',
      badge: 'Order Health',
      icon: 'donut_large',
      shortDescription: 'Order counts and revenue segmented by lifecycle fulfillment status.',
      purpose: 'Monitors the health of the fulfillment funnel by breaking down orders into Delivered, In Progress, Placed, and Cancelled.',
      metrics: ['Status Classification', 'Order Count', 'Associated Revenue Volume'],
      businessValue: 'Detects fulfillment failure rates, cancellation patterns, and operational bottlenecks in the order pipeline.'
    }
  };

  subTabMetaMap: Record<string, ReportSubTabMeta> = {
    'Chart': {
      name: 'Visual Chart View',
      icon: 'bar_chart',
      description: 'Interactive graphical visualization of the current dataset.',
      purpose: 'Switch between Bar, Line, Pie, Area, Scatter, and Doughnut charts with instant PNG image export.'
    },
    'Table': {
      name: 'Data Table View',
      icon: 'table_view',
      description: 'Structured spreadsheet table with exact figures and multi-column alignment.',
      purpose: 'Examine detailed numeric records, currency breakdowns, sticky column layouts, and export to CSV or PDF.'
    }
  };

  hoveredTabInfo = signal<ReportTabMeta | null>(null);
  hoveredSubTabInfo = signal<ReportSubTabMeta | null>(null);
  tooltipPosition = signal<{ top: string; left: string; arrowLeft: string }>({ top: '0px', left: '0px', arrowLeft: '50%' });

  private hoverTimeout: any = null;

  showTabTooltip(tab: string, event: MouseEvent | FocusEvent) {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }
    const meta = this.tabMetaMap[tab];
    if (!meta) return;

    const target = event.currentTarget as HTMLElement;
    if (target) {
      const rect = target.getBoundingClientRect();
      const tooltipWidth = 360;
      const margin = 16;
      let left = rect.left + rect.width / 2 - tooltipWidth / 2;
      
      if (left < margin) {
        left = margin;
      } else if (left + tooltipWidth > window.innerWidth - margin) {
        left = window.innerWidth - tooltipWidth - margin;
      }

      const arrowLeft = Math.max(20, Math.min(tooltipWidth - 20, rect.left + rect.width / 2 - left));
      let top = rect.bottom + 8;
      if (top + 260 > window.innerHeight && rect.top > 260) {
        top = rect.top - 268;
      }

      this.tooltipPosition.set({
        top: `${Math.round(top)}px`,
        left: `${Math.round(left)}px`,
        arrowLeft: `${Math.round(arrowLeft)}px`
      });
      this.hoveredSubTabInfo.set(null);
      this.hoveredTabInfo.set(meta);
    }
  }

  hideTabTooltip() {
    this.hoverTimeout = setTimeout(() => {
      this.hoveredTabInfo.set(null);
      this.hoveredSubTabInfo.set(null);
    }, 100);
  }

  showSubTabTooltip(subTab: string, event: MouseEvent | FocusEvent) {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }
    const meta = this.subTabMetaMap[subTab];
    if (!meta) return;

    const target = event.currentTarget as HTMLElement;
    if (target) {
      const rect = target.getBoundingClientRect();
      const tooltipWidth = 290;
      const margin = 16;
      let left = rect.left + rect.width / 2 - tooltipWidth / 2;
      if (left < margin) left = margin;
      else if (left + tooltipWidth > window.innerWidth - margin) left = window.innerWidth - tooltipWidth - margin;

      const arrowLeft = Math.max(20, Math.min(tooltipWidth - 20, rect.left + rect.width / 2 - left));
      let top = rect.bottom + 8;

      this.tooltipPosition.set({
        top: `${Math.round(top)}px`,
        left: `${Math.round(left)}px`,
        arrowLeft: `${Math.round(arrowLeft)}px`
      });
      this.hoveredTabInfo.set(null);
      this.hoveredSubTabInfo.set(meta);
    }
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    if (this.hoveredTabInfo() || this.hoveredSubTabInfo()) {
      this.hoveredTabInfo.set(null);
      this.hoveredSubTabInfo.set(null);
    }
  }

  currentTabInfo = computed(() => {
    return this.tabMetaMap[this.currentTab()] || {
      name: this.currentTab(),
      category: 'Analytics',
      badge: 'Report',
      icon: 'analytics',
      shortDescription: 'Detailed analytics and report metrics.',
      purpose: 'Track and analyze key business metrics according to the selected tab criteria.',
      metrics: ['Orders', 'Revenue', 'Performance'],
      businessValue: 'Supports operational insight and management decision making.'
    };
  });

  // Reset sub-tab when main tab changes
  constructor() {
    effect(() => {
      this.currentTab();
      this.currentSubTab.set('Table');
    });

    // Handle query params for navigation from delivery list
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.currentTab.set(params['tab']);
      }
      if (params['deliveryPersonId']) {
        this.deliveryFilter.set(params['deliveryPersonId']);
      }
    });
  }

  // Filters
  startDate = signal<string>('');
  endDate = signal<string>('');
  statusFilter = signal<string>('all');
  hotelFilter = signal<string>('all');
  deliveryFilter = signal<string>('all');

  uniqueHotels = computed(() => {
    return this.catalog.hotels().sort((a, b) => a.name.localeCompare(b.name));
  });

  filteredOrders = computed(() => {
    let result = this.orders();
    
    const start = this.startDate();
    const end = this.endDate();
    const status = this.statusFilter();
    const hotelId = this.hotelFilter();
    const deliveryId = this.deliveryFilter();

    if (start) {
      const startDate = new Date(start).getTime();
      result = result.filter(o => o.created_at && new Date(o.created_at).getTime() >= startDate);
    }
    
    if (end) {
      const endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999);
      result = result.filter(o => o.created_at && new Date(o.created_at).getTime() <= endDate.getTime());
    }

    if (status !== 'all') {
      result = result.filter(o => o.status?.toLowerCase() === status.toLowerCase());
    }

    if (hotelId !== 'all') {
      const id = parseInt(hotelId);
      result = result.filter(o => o.hotel_id === id);
    }

    if (deliveryId !== 'all') {
      const id = parseInt(deliveryId);
      result = result.filter(o => o.delivery_person_id === id);
    }

    const term = this.search.searchTerm().toLowerCase().trim();
    if (term) {
      result = result.filter(o => 
        (o.order_number?.toLowerCase().includes(term) || false) || 
        (o.hotel_name?.toLowerCase().includes(term) || false) || 
        (o.customer_name?.toLowerCase().includes(term) || false) || 
        (o.customer_phone?.toLowerCase().includes(term) || false) || 
        (o.delivery_person_name?.toLowerCase().includes(term) || false) || 
        (o.delivery_address?.toLowerCase().includes(term) || false)
      );
    }

    return result;
  });

  validFilteredOrders = computed(() => {
    if (this.statusFilter().toLowerCase() === 'cancelled') {
      return [];
    }
    return this.filteredOrders().filter(o => (o.status || '').toLowerCase() !== 'cancelled');
  });

  cancelledFilteredOrders = computed(() => {
    return this.filteredOrders().filter(o => (o.status || '').toLowerCase() === 'cancelled');
  });

  totalLostRevenue = computed(() => {
    return this.cancelledFilteredOrders().reduce((sum, o) => sum + (Number(o.grand_total) || 0), 0);
  });

  tableConfig = computed(() => {
    const tab = this.currentTab();
    if (tab === 'Payment Sheet') {
      const orders = this.validFilteredOrders();
      // Get all unique hotels from filtered orders or all orders to have consistent columns
      const hotelNames = Array.from(new Set(this.orders().map(o => (o.hotel_id === -1 || o.hotel_id === null) ? 'Manual Order' : (o.hotel_name || 'Unknown')))).sort();
      
      // Group orders by date and hotel
      const groupedByDate: Record<string, Record<string, number>> = {};
      orders.forEach(o => {
        if (o.created_at) {
          const date = new Date(o.created_at).toLocaleDateString('en-IN');
          const hotel = (o.hotel_id === -1 || o.hotel_id === null) ? 'Manual Order' : (o.hotel_name || 'Unknown');
          if (!groupedByDate[date]) groupedByDate[date] = {};
          groupedByDate[date][hotel] = (groupedByDate[date][hotel] || 0) + (Number(o.subtotal) || 0);
        }
      });

      // Generate all dates in the range
      const dates: string[] = [];
      const startStr = this.startDate();
      const endStr = this.endDate();

      if (startStr && endStr) {
        const start = new Date(startStr);
        const end = new Date(endStr);
        const current = new Date(start);
        
        while (current <= end) {
          dates.push(new Date(current).toLocaleDateString('en-IN'));
          current.setDate(current.getDate() + 1);
        }
      } else {
        // Fallback to sorted unique dates from existing orders if range is not selected
        Object.keys(groupedByDate).sort((a, b) => {
          const [d1, m1, y1] = a.split('/').map(Number);
          const [d2, m2, y2] = b.split('/').map(Number);
          return new Date(y1, m1 - 1, d1).getTime() - new Date(y2, m2 - 1, d2).getTime();
        }).forEach(d => dates.push(d));
      }
      
      const rows = dates.map((date, index) => {
        const rowData = hotelNames.map(h => groupedByDate[date] ? (groupedByDate[date][h] || 0) : 0);
        const rowTotal = rowData.reduce((sum, val) => sum + val, 0);
        return [
          (index + 1).toString(),
          date,
          ...rowData.map(v => v > 0 ? `₹${v.toLocaleString()}` : '-'),
          `₹${rowTotal.toLocaleString()}`
        ];
      });

      // Add Grand Total row if there is data
      if (dates.length > 0) {
        const colTotals = hotelNames.map(h => {
          return dates.reduce((sum, d) => sum + (groupedByDate[d] ? (groupedByDate[d][h] || 0) : 0), 0);
        });
        const grandTotal = colTotals.reduce((sum, val) => sum + val, 0);
        
        rows.push([
          '',
          'GRAND TOTAL',
          ...colTotals.map(v => v > 0 ? `₹${v.toLocaleString()}` : '-'),
          `₹${grandTotal.toLocaleString()}`
        ]);
      }

      return {
        headers: ['SI.No', 'Date', ...hotelNames, 'Total'],
        rows: rows,
        headerColor: 'bg-indigo-50 dark:bg-indigo-900/20'
      };
    } else if (tab === 'Cancelled Orders') {
      const cancelled = this.cancelledFilteredOrders();
      const rows: (string | number)[][] = cancelled.map(o => [
        o.order_number || '',
        o.created_at ? new Date(o.created_at).toLocaleString('en-IN') : '',
        (o.hotel_id === -1 || o.hotel_id === null) ? 'Manual Order' : (o.hotel_name || ''),
        o.customer_name || 'N/A',
        o.customer_phone || 'N/A',
        o.delivery_address || 'N/A',
        `₹${(Number(o.grand_total) || 0).toLocaleString()}`
      ]);

      if (cancelled.length > 0) {
        const totalLost = cancelled.reduce((sum, o) => sum + (Number(o.grand_total) || 0), 0);
        rows.push([
          '',
          'GRAND TOTAL',
          `${cancelled.length} Cancelled Orders`,
          '',
          '',
          'Total Revenue Lost:',
          `₹${totalLost.toLocaleString()}`
        ]);
      }

      return {
        headers: ['Order ID', 'Date & Time', 'Hotel', 'Customer', 'Phone', 'Address', 'Lost Revenue (₹)'],
        rows: rows,
        headerColor: 'bg-red-50 dark:bg-red-950/20'
      };
    } else if (tab === 'Hotel-wise') {
      const hotels = Object.values(this.groupedByHotel());
      const rows: (string | number)[][] = hotels.map(g => [
        g.name,
        g.orders,
        `₹${g.revenue.toLocaleString()}`,
        g.orders > 0 ? `₹${Math.round(g.revenue / g.orders).toLocaleString()}` : '₹0',
        g.cancelledOrders,
        `₹${g.lostRevenue.toLocaleString()}`
      ]);

      if (hotels.length > 0) {
        const totalCompleted = hotels.reduce((sum, h) => sum + h.orders, 0);
        const totalRealRev = hotels.reduce((sum, h) => sum + h.revenue, 0);
        const totalCancelled = hotels.reduce((sum, h) => sum + h.cancelledOrders, 0);
        const totalLost = hotels.reduce((sum, h) => sum + h.lostRevenue, 0);
        const avg = totalCompleted > 0 ? Math.round(totalRealRev / totalCompleted) : 0;
        rows.push([
          'GRAND TOTAL',
          totalCompleted,
          `₹${totalRealRev.toLocaleString()}`,
          `₹${avg.toLocaleString()}`,
          totalCancelled,
          `₹${totalLost.toLocaleString()}`
        ]);
      }

      return {
        headers: ['Hotel', 'Completed Orders', 'Real Revenue', 'Avg Order', 'Cancelled Orders', 'Revenue Lost'],
        rows: rows,
        headerColor: 'bg-indigo-50 dark:bg-indigo-900/20'
      };
    } else if (tab === 'Delivery Man-wise' || tab === 'Delivery Person-wise') {
      const drivers = Object.values(this.groupedByDelivery());
      const rows: (string | number)[][] = drivers.map(g => [
        g.name,
        g.orders,
        `₹${g.earnings.toLocaleString()}`,
        `₹${g.advance.toLocaleString()}`,
        g.cancelled
      ]);

      if (drivers.length > 0) {
        const totalOrders = drivers.reduce((sum, d) => sum + d.orders, 0);
        const totalEarnings = drivers.reduce((sum, d) => sum + d.earnings, 0);
        const totalAdvance = drivers.reduce((sum, d) => sum + d.advance, 0);
        const totalCancelled = drivers.reduce((sum, d) => sum + d.cancelled, 0);
        rows.push([
          'GRAND TOTAL',
          totalOrders,
          `₹${totalEarnings.toLocaleString()}`,
          `₹${totalAdvance.toLocaleString()}`,
          totalCancelled
        ]);
      }

      return {
        headers: ['Delivery Person', 'Completed Orders', 'Net Earnings', 'Advance Collected', 'Cancelled Trips'],
        rows: rows,
        headerColor: 'bg-emerald-50 dark:bg-emerald-900/20'
      };
    } else if (tab === 'Monthly Salary') {
      const monthly = Object.values(this.groupedByMonthlyDelivery());
      const rows: (string | number)[][] = monthly.map(g => [g.month, g.name, g.orders, `₹${g.earnings.toLocaleString()}`, `₹${g.advance.toLocaleString()}`]);

      if (monthly.length > 0) {
        const totalOrders = monthly.reduce((sum, m) => sum + m.orders, 0);
        const totalEarnings = monthly.reduce((sum, m) => sum + m.earnings, 0);
        const totalAdvance = monthly.reduce((sum, m) => sum + m.advance, 0);
        rows.push([
          'GRAND TOTAL',
          '',
          totalOrders,
          `₹${totalEarnings.toLocaleString()}`,
          `₹${totalAdvance.toLocaleString()}`
        ]);
      }

      return {
        headers: ['Month', 'Delivery Person', 'Orders', 'Earnings', 'Advance'],
        rows: rows,
        headerColor: 'bg-blue-50 dark:bg-blue-900/20'
      };
    } else if (tab === 'Menu-wise') {
      const menus = Object.values(this.groupedByMenu());
      const rows: (string | number)[][] = menus.map(g => [g.name, g.quantity, `₹${g.revenue.toLocaleString()}`]);

      if (menus.length > 0) {
        const totalQty = menus.reduce((sum, m) => sum + m.quantity, 0);
        const totalRev = menus.reduce((sum, m) => sum + m.revenue, 0);
        rows.push([
          'GRAND TOTAL',
          totalQty,
          `₹${totalRev.toLocaleString()}`
        ]);
      }

      return {
        headers: ['Menu Item', 'Quantity', 'Revenue'],
        rows: rows,
        headerColor: 'bg-amber-50 dark:bg-amber-900/20'
      };
    } else if (tab === 'Time-of-Day') {
      const grouped: Record<string, number> = {};
      this.validFilteredOrders().forEach(o => {
        if (o.created_at) {
          const hour = new Date(o.created_at).getHours();
          const label = `${hour}:00 - ${hour + 1}:00`;
          grouped[label] = (grouped[label] || 0) + 1;
        }
      });
      const sorted = Object.entries(grouped).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
      return {
        headers: ['Time of Day', 'Orders'],
        rows: sorted.map(g => [g[0], g[1]]),
        headerColor: 'bg-blue-50 dark:bg-blue-900/20'
      };
    } else if (tab === 'Status-wise') {
      const countGroup: Record<string, number> = {};
      const revGroup: Record<string, number> = {};
      this.filteredOrders().forEach(o => {
        const status = o.status || 'Unknown';
        countGroup[status] = (countGroup[status] || 0) + 1;
        revGroup[status] = (revGroup[status] || 0) + (Number(o.grand_total) || 0);
      });
      return {
        headers: ['Order Status', 'Order Count', 'Total Amount / Value', 'Classification'],
        rows: Object.keys(countGroup).map(s => [
          s,
          countGroup[s],
          `₹${revGroup[s].toLocaleString()}`,
          s.toLowerCase() === 'cancelled' ? 'Revenue Lost' : 'Realized Revenue'
        ]),
        headerColor: 'bg-purple-50 dark:bg-purple-900/20'
      };
    } else if (tab === 'Commission / Earnings') {
      const validOrders = this.validFilteredOrders();
      const rows: (string | number)[][] = validOrders.map(o => [
        o.order_number || '',
        (o.hotel_id === -1 || o.hotel_id === null) ? 'Manual Order' : (o.hotel_name || ''),
        `₹${(o.shipping_fee || 0).toLocaleString()}`,
        `${o.commission_percentage_applied || 0}%`,
        `₹${(o.admin_commission_amount || 0).toLocaleString()}`
      ]);

      if (validOrders.length > 0) {
        const totalDC = validOrders.reduce((sum, o) => sum + (Number(o.shipping_fee) || 0), 0);
        const totalComm = validOrders.reduce((sum, o) => sum + (Number(o.admin_commission_amount) || 0), 0);
        rows.push([
          '',
          'GRAND TOTAL',
          `₹${totalDC.toLocaleString()}`,
          '-',
          `₹${totalComm.toLocaleString()}`
        ]);
      }

      return {
        headers: ['Order ID', 'Hotel', 'DC (₹)', 'Comm %', 'Comm Amt (₹)'],
        rows: rows,
        headerColor: 'bg-emerald-50 dark:bg-emerald-900/20'
      };
    } else {
      const orders = this.statusFilter().toLowerCase() === 'cancelled' 
        ? this.cancelledFilteredOrders() 
        : this.validFilteredOrders();
      const totalAmount = orders.reduce((sum, o) => sum + (Number(o.grand_total) || 0), 0);
      
      const rows: (string | number)[][] = orders.map(o => [
        o.order_number || '',
        o.created_at ? new Date(o.created_at).toLocaleDateString() : '',
        (o.hotel_id === -1 || o.hotel_id === null) ? 'Manual Order' : (o.hotel_name || ''),
        o.delivery_address || '',
        o.status || '',
        `₹${(Number(o.grand_total) || 0).toLocaleString()}`
      ]);

      if (orders.length > 0) {
        rows.push([
          '',
          'GRAND TOTAL',
          `${orders.length} Orders`,
          '',
          this.statusFilter().toLowerCase() === 'cancelled' ? 'Total Lost' : 'Real Net Total',
          `₹${totalAmount.toLocaleString()}`
        ]);
      }

      return {
        headers: ['Order ID', 'Date', 'Hotel', 'Address', 'Status', 'Bill Total'],
        rows: rows,
        headerColor: 'bg-slate-50 dark:bg-slate-900/20'
      };
    }
  });

  groupedByMonthlyDelivery = computed(() => {
    const grouped: Record<string, { month: string, name: string, orders: number, earnings: number, advance: number }> = {};
    const drivers = this.drivers();
    
    this.validFilteredOrders().forEach(o => {
      if (o.created_at) {
        const date = new Date(o.created_at);
        const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
        const dpId = o.delivery_person_id || 0;
        const key = `${monthYear}_${dpId}`;
        
        if (!grouped[key]) {
          // Try to find name from drivers list if missing in order
          let name = o.delivery_person_name;
          if (!name && dpId) {
            const driver = drivers.find(d => d.id === dpId);
            if (driver) name = driver.name;
          }
          
          grouped[key] = { 
            month: monthYear, 
            name: name || 'Unassigned', 
            orders: 0, 
            earnings: 0,
            advance: 0
          };
        }
        
        grouped[key].orders++;
        const shippingFee = Number(o.shipping_fee) || 0;
        const adminComm = Number(o.admin_commission_amount) || 0;
        grouped[key].earnings += (shippingFee - adminComm);
        grouped[key].advance += Number(o.amount_received) || 0;
      }
    });
    return grouped;
  });

  groupedByHotel = computed(() => {
    const grouped: Record<number, { name: string, orders: number, revenue: number, cancelledOrders: number, lostRevenue: number }> = {};
    this.filteredOrders().forEach(o => {
      const hId = o.hotel_id === null ? -1 : o.hotel_id;
      if (!grouped[hId]) {
        grouped[hId] = {
          name: hId === -1 ? 'Manual Order' : (o.hotel_name || 'Unknown'),
          orders: 0,
          revenue: 0,
          cancelledOrders: 0,
          lostRevenue: 0
        };
      }
      const isCancelled = (o.status || '').toLowerCase() === 'cancelled';
      if (isCancelled) {
        grouped[hId].cancelledOrders++;
        grouped[hId].lostRevenue += Number(o.grand_total) || 0;
      } else {
        grouped[hId].orders++;
        grouped[hId].revenue += Number(o.grand_total) || 0;
      }
    });
    return grouped;
  });

  groupedByDelivery = computed(() => {
    const grouped: Record<number, { name: string, orders: number, earnings: number, advance: number, cancelled: number }> = {};
    const drivers = this.drivers();
    
    this.filteredOrders().forEach(o => {
      const dpId = o.delivery_person_id || 0;
      if (!grouped[dpId]) {
        let name = o.delivery_person_name;
        if (!name && dpId) {
          const driver = drivers.find(d => d.id === dpId);
          if (driver) name = driver.name;
        }
        grouped[dpId] = { name: name || 'Unassigned', orders: 0, earnings: 0, advance: 0, cancelled: 0 };
      }
      const isCancelled = (o.status || '').toLowerCase() === 'cancelled';
      if (isCancelled) {
        grouped[dpId].cancelled++;
      } else {
        grouped[dpId].orders++;
        const deliveryFee = Number(o.shipping_fee) || 0;
        const adminComm = Number(o.admin_commission_amount) || 0;
        grouped[dpId].earnings += (deliveryFee - adminComm);
        grouped[dpId].advance += Number(o.amount_received) || 0;
      }
    });
    return grouped;
  });

  groupedByMenu = computed(() => {
    const grouped: Record<number, { name: string, quantity: number, revenue: number }> = {};
    this.validFilteredOrders().forEach(o => {
      (o.items || []).forEach(item => {
        if (!grouped[item.menu_id]) grouped[item.menu_id] = { name: item.menu_name || 'Unknown', quantity: 0, revenue: 0 };
        grouped[item.menu_id].quantity += Number(item.quantity) || 0;
        grouped[item.menu_id].revenue += Number(item.total) || 0;
      });
    });
    return grouped;
  });

  metrics = computed(() => {
    const data = this.filteredOrders();
    const tab = this.currentTab();
    
    if (tab === 'Overview') {
      const valid = this.validFilteredOrders();
      const cancelled = this.cancelledFilteredOrders();
      const totalOrdersCount = this.filteredOrders().length;
      const grossTotal = this.filteredOrders().reduce((sum, o) => sum + (Number(o.grand_total) || 0), 0);
      const totalRealRevenue = valid.reduce((sum, o) => sum + (Number(o.grand_total) || 0), 0);
      const lostRevenue = cancelled.reduce((sum, o) => sum + (Number(o.grand_total) || 0), 0);
      
      let totalHotelEarnings = 0;
      let totalDeliverySalary = 0;
      let totalAdminCommission = 0;
      
      valid.forEach(o => {
        const adminComm = Number(o.admin_commission_amount) || 0;
        const deliveryFee = Number(o.shipping_fee) || 0;
        const hotelEarn = Number(o.subtotal) || 0;
        const deliveryEarn = deliveryFee - adminComm;
        
        totalHotelEarnings += hotelEarn;
        totalDeliverySalary += deliveryEarn;
        totalAdminCommission += adminComm;
      });
      return {
        type: 'Overview',
        items: [
          { label: 'Gross Order Volume', value: `₹${grossTotal.toLocaleString()} (${totalOrdersCount} orders)` },
          { label: 'Cancelled Deductions', value: `-₹${lostRevenue.toLocaleString()} (${cancelled.length} orders)` },
          { label: 'Real Net Revenue', value: `₹${totalRealRevenue.toLocaleString()} (${valid.length} completed)` },
          { label: 'Hotel Settlement (Subtotal)', value: `₹${totalHotelEarnings.toLocaleString()}` },
          { label: 'Delivery Salary (DC - Comm)', value: `₹${totalDeliverySalary.toLocaleString()}` },
          { label: 'Admin Commission Retained', value: `₹${totalAdminCommission.toLocaleString()}` }
        ]
      };
    } else if (tab === 'Cancelled Orders') {
      const cancelled = this.cancelledFilteredOrders();
      const lostRev = cancelled.reduce((sum, o) => sum + (Number(o.grand_total) || 0), 0);
      const totalOrdersCount = this.filteredOrders().length;
      const rate = totalOrdersCount > 0 ? ((cancelled.length / totalOrdersCount) * 100).toFixed(1) : '0';
      return {
        type: 'Cancelled Orders',
        items: [
          { label: 'Cancelled Orders Count', value: cancelled.length.toString() },
          { label: 'Total Revenue Lost', value: `₹${lostRev.toLocaleString()}` },
          { label: 'Avg Lost Per Order', value: cancelled.length > 0 ? `₹${Math.round(lostRev / cancelled.length).toLocaleString()}` : '₹0' },
          { label: 'Cancellation Rate', value: `${rate}%` }
        ]
      };
    } else if (tab === 'Payment Sheet') {
      const orders = this.validFilteredOrders();
      const totalSubtotal = orders.reduce((sum, o) => sum + (Number(o.subtotal) || 0), 0);
      const uniqueHotels = new Set(orders.map(o => o.hotel_id)).size;
      const uniqueDays = new Set(orders.map(o => o.created_at ? new Date(o.created_at).toLocaleDateString() : '')).size;
      return {
        type: 'Payment Sheet',
        items: [
          { label: 'Real Vendor Settlement', value: `₹${totalSubtotal.toLocaleString()}` },
          { label: 'Settled Hotel Partners', value: uniqueHotels.toString() },
          { label: 'Active Billing Days', value: uniqueDays.toString() }
        ]
      };
    } else if (tab === 'Monthly Salary') {
      const monthlyData = Object.values(this.groupedByMonthlyDelivery());
      const totalEarned = monthlyData.reduce((sum, m) => sum + m.earnings, 0);
      const totalAdvance = monthlyData.reduce((sum, m) => sum + m.advance, 0);
      return {
        type: 'Monthly Salary',
        items: [
          { label: 'Total Rider Earnings', value: `₹${totalEarned.toLocaleString()}` },
          { label: 'Cash Advance Deductions', value: `₹${totalAdvance.toLocaleString()}` },
          { label: 'Net Payable Salary', value: `₹${(totalEarned - totalAdvance).toLocaleString()}` }
        ]
      };
    } else if (tab === 'Master Chart View') {
      const valid = this.validFilteredOrders();
      const cancelled = this.cancelledFilteredOrders();
      const totalRev = valid.reduce((sum, o) => sum + (Number(o.grand_total) || 0), 0);
      const lostRev = cancelled.reduce((sum, o) => sum + (Number(o.grand_total) || 0), 0);
      return {
        type: 'Master Chart View',
        items: [
          { label: 'Analytical Panels', value: '11 Charts' },
          { label: 'Completed Orders', value: valid.length.toString() },
          { label: 'Real Net Revenue', value: `₹${totalRev.toLocaleString()}` },
          { label: 'Cancelled Orders', value: cancelled.length.toString() },
          { label: 'Revenue Lost', value: `₹${lostRev.toLocaleString()}` }
        ]
      };
    } else if (tab === 'Hotel-wise') {
      const hotels = Object.values(this.groupedByHotel());
      const totalRealRev = hotels.reduce((sum, h) => sum + h.revenue, 0);
      const totalLostRev = hotels.reduce((sum, h) => sum + h.lostRevenue, 0);
      const totalCompleted = hotels.reduce((sum, h) => sum + h.orders, 0);
      const totalCancelled = hotels.reduce((sum, h) => sum + h.cancelledOrders, 0);
      return {
        type: 'Hotel-wise',
        items: [
          { label: 'Total Real Revenue', value: `₹${totalRealRev.toLocaleString()}` },
          { label: 'Completed Orders', value: totalCompleted.toString() },
          { label: 'Total Revenue Lost', value: `₹${totalLostRev.toLocaleString()}` },
          { label: 'Cancelled Orders', value: totalCancelled.toString() }
        ]
      };
    } else if (tab === 'Delivery Man-wise' || tab === 'Delivery Person-wise') {
      const list = Object.values(this.groupedByDelivery());
      const totalEarn = list.reduce((sum, d) => sum + d.earnings, 0);
      const totalAdv = list.reduce((sum, d) => sum + d.advance, 0);
      const totalCompleted = list.reduce((sum, d) => sum + d.orders, 0);
      return {
        type: 'Delivery Person-wise',
        items: [
          { label: 'Total Completed Deliveries', value: totalCompleted.toString() },
          { label: 'Total Net Earnings', value: `₹${totalEarn.toLocaleString()}` },
          { label: 'Advance Deductions', value: `₹${totalAdv.toLocaleString()}` },
          { label: 'Net Payable', value: `₹${(totalEarn - totalAdv).toLocaleString()}` }
        ]
      };
    } else if (tab === 'Menu-wise') {
      const list = Object.values(this.groupedByMenu());
      const totalItems = list.reduce((sum, m) => sum + m.quantity, 0);
      const totalMenuRev = list.reduce((sum, m) => sum + m.revenue, 0);
      return {
        type: 'Menu-wise',
        items: [
          { label: 'Total Items Sold', value: totalItems.toLocaleString() },
          { label: 'Real Menu Revenue', value: `₹${totalMenuRev.toLocaleString()}` },
          { label: 'Unique Menu Items', value: list.length.toString() }
        ]
      };
    } else if (tab === 'Orders') {
      const valid = this.validFilteredOrders();
      const cancelled = this.cancelledFilteredOrders();
      const realRev = valid.reduce((sum, o) => sum + (Number(o.grand_total) || 0), 0);
      const lostRev = cancelled.reduce((sum, o) => sum + (Number(o.grand_total) || 0), 0);
      return {
        type: 'Orders',
        items: [
          { label: 'Completed Orders', value: valid.length.toString() },
          { label: 'Real Net Revenue', value: `₹${realRev.toLocaleString()}` },
          { label: 'Cancelled Orders', value: cancelled.length.toString() },
          { label: 'Revenue Lost', value: `₹${lostRev.toLocaleString()}` }
        ]
      };
    } else if (tab === 'Commission / Earnings') {
      const valid = this.validFilteredOrders();
      const totalComm = valid.reduce((sum, o) => sum + (Number(o.admin_commission_amount) || 0), 0);
      const totalDC = valid.reduce((sum, o) => sum + (Number(o.shipping_fee) || 0), 0);
      return {
        type: 'Commission / Earnings',
        items: [
          { label: 'Total Delivery Charges (DC)', value: `₹${totalDC.toLocaleString()}` },
          { label: 'Total Admin Commission', value: `₹${totalComm.toLocaleString()}` },
          { label: 'Net Delivery Earnings', value: `₹${(totalDC - totalComm).toLocaleString()}` }
        ]
      };
    } else if (tab === 'Top Performing Hotels') {
      const grouped = this.groupedByHotel();
      return {
        type: 'Top Performing Hotels',
        items: Object.values(grouped)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5)
          .map(g => ({ label: g.name, value: `₹${g.revenue.toLocaleString()} (${g.orders} orders)` }))
      };
    } else if (tab === 'Top Selling Menus') {
      const grouped = this.groupedByMenu();
      return {
        type: 'Top Selling Menus',
        items: Object.values(grouped)
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 5)
          .map(g => ({ label: g.name, value: `Qty: ${g.quantity} (₹${g.revenue.toLocaleString()})` }))
      };
    } else if (tab === 'Time-of-Day') {
      const grouped: Record<string, number> = {};
      this.validFilteredOrders().forEach(o => {
        if (o.created_at) {
          const hour = new Date(o.created_at).getHours();
          const label = `${hour}:00 - ${hour + 1}:00`;
          grouped[label] = (grouped[label] || 0) + 1;
        }
      });
      return {
        type: 'Time-of-Day',
        items: Object.entries(grouped).map(g => ({
          label: g[0],
          value: `Orders: ${g[1]}`
        }))
      };
    } else if (tab === 'Status-wise') {
      const countGroup: Record<string, number> = {};
      const revGroup: Record<string, number> = {};
      data.forEach(o => {
        const status = o.status || 'Unknown';
        countGroup[status] = (countGroup[status] || 0) + 1;
        revGroup[status] = (revGroup[status] || 0) + (Number(o.grand_total) || 0);
      });
      return {
        type: 'Status-wise',
        items: Object.keys(countGroup).map(s => ({
          label: s,
          value: `${countGroup[s]} orders | ₹${revGroup[s].toLocaleString()} (${s.toLowerCase() === 'cancelled' ? 'Lost' : 'Realized'})`
        }))
      };
    }
    return { type: 'Other', items: [] };
  });

  chartOptions = computed(() => {
    return this.getChartOptions(this.currentTab());
  });

  getChartOptions(tab: string): EChartsOption {
    const data = this.filteredOrders();
    const type = this.chartType();
    
    let xAxisData: string[] = [];
    let seriesData: number[] = [];
    
    if (tab === 'Overview') {
      // Group by date using valid orders (real revenue)
      const grouped: Record<string, number> = {};
      this.validFilteredOrders().forEach(o => {
        const date = o.created_at ? new Date(o.created_at).toLocaleDateString() : 'Unknown';
        grouped[date] = (grouped[date] || 0) + (Number(o.grand_total) || 0);
      });
      xAxisData = Object.keys(grouped);
      seriesData = Object.values(grouped);
    } else if (tab === 'Cancelled Orders') {
      const grouped: Record<string, number> = {};
      this.cancelledFilteredOrders().forEach(o => {
        const hotel = (o.hotel_id === -1 || o.hotel_id === null) ? 'Manual Order' : (o.hotel_name || 'Unknown');
        grouped[hotel] = (grouped[hotel] || 0) + (Number(o.grand_total) || 0);
      });
      xAxisData = Object.keys(grouped);
      seriesData = Object.values(grouped);
    } else if (tab === 'Payment Sheet') {
      const grouped: Record<string, number> = {};
      this.validFilteredOrders().forEach(o => {
        const date = o.created_at ? new Date(o.created_at).toLocaleDateString() : 'Unknown';
        grouped[date] = (grouped[date] || 0) + (Number(o.subtotal) || 0);
      });
      xAxisData = Object.keys(grouped);
      seriesData = Object.values(grouped);
    } else if (tab === 'Hotel-wise') {
      const hotelData = this.groupedByHotel();
      xAxisData = Object.values(hotelData).map(h => h.name);
      seriesData = Object.values(hotelData).map(h => h.revenue);
    } else if (tab === 'Delivery Man-wise' || tab === 'Delivery Person-wise') {
      const deliveryData = this.groupedByDelivery();
      xAxisData = Object.values(deliveryData).map(d => d.name);
      seriesData = Object.values(deliveryData).map(d => d.earnings);
    } else if (tab === 'Monthly Salary') {
      const monthlyData = Object.values(this.groupedByMonthlyDelivery());
      xAxisData = monthlyData.map(m => `${m.month} (${m.name})`);
      seriesData = monthlyData.map(m => m.earnings);
    } else if (tab === 'Menu-wise') {
      const menuData = this.groupedByMenu();
      xAxisData = Object.values(menuData).map(m => m.name);
      seriesData = Object.values(menuData).map(m => m.revenue);
    } else if (tab === 'Orders') {
      const grouped: Record<string, number> = {};
      this.validFilteredOrders().forEach(o => {
        const date = o.created_at ? new Date(o.created_at).toLocaleDateString() : 'Unknown';
        grouped[date] = (grouped[date] || 0) + 1;
      });
      xAxisData = Object.keys(grouped);
      seriesData = Object.values(grouped);
    } else if (tab === 'Commission / Earnings') {
      const grouped: Record<string, number> = {};
      this.validFilteredOrders().forEach(o => {
        const comm = Number(o.admin_commission_amount) || 0;
        const date = o.created_at ? new Date(o.created_at).toLocaleDateString() : 'Unknown';
        grouped[date] = (grouped[date] || 0) + comm;
      });
      xAxisData = Object.keys(grouped);
      seriesData = Object.values(grouped);
    } else if (tab === 'Top Performing Hotels') {
      const grouped = this.groupedByHotel();
      const sorted = Object.values(grouped).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
      xAxisData = sorted.map(e => e.name);
      seriesData = sorted.map(e => e.revenue);
    } else if (tab === 'Top Selling Menus') {
      const grouped = this.groupedByMenu();
      const sorted = Object.values(grouped).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
      xAxisData = sorted.map(e => e.name);
      seriesData = sorted.map(e => e.quantity);
    } else if (tab === 'Time-of-Day') {
      const grouped: Record<string, number> = {};
      this.validFilteredOrders().forEach(o => {
        if (o.created_at) {
          const hour = new Date(o.created_at).getHours();
          const label = `${hour}:00 - ${hour + 1}:00`;
          grouped[label] = (grouped[label] || 0) + 1;
        }
      });
      const sorted = Object.entries(grouped).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
      xAxisData = sorted.map(e => e[0]);
      seriesData = sorted.map(e => e[1]);
    } else if (tab === 'Status-wise') {
      const grouped: Record<string, number> = {};
      data.forEach(o => {
        const status = o.status || 'Unknown';
        grouped[status] = (grouped[status] || 0) + (Number(o.grand_total) || 0);
      });
      xAxisData = Object.keys(grouped);
      seriesData = Object.values(grouped);
    }

    if (type === 'pie') {
      const pieData = xAxisData.map((name, index) => ({ name, value: seriesData[index] }));
      return {
        title: { text: `${tab} Report`, left: 'center' },
        tooltip: { trigger: 'item' as const },
        series: [{ data: pieData, type: 'pie', radius: '50%' }]
      };
    } else if (type === 'doughnut') {
      const pieData = xAxisData.map((name, index) => ({ name, value: seriesData[index] }));
      return {
        title: { text: `${tab} Report`, left: 'center' },
        tooltip: { trigger: 'item' as const },
        series: [{ data: pieData, type: 'pie', radius: ['40%', '70%'] }]
      };
    } else if (type === 'area') {
      return {
        title: { text: `${tab} Report`, left: 'center' },
        tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' } },
        xAxis: { type: 'category' as const, data: xAxisData, axisLabel: { rotate: 45 } },
        yAxis: { type: 'value' },
        series: [{ data: seriesData, type: 'line', areaStyle: {}, itemStyle: { color: '#FFC107' }, smooth: true }]
      };
    } else if (type === 'scatter') {
      return {
        title: { text: `${tab} Report`, left: 'center' },
        tooltip: { trigger: 'item' as const },
        xAxis: { type: 'category' as const, data: xAxisData, axisLabel: { rotate: 45 } },
        yAxis: { type: 'value' },
        series: [{ data: seriesData, type: 'scatter', itemStyle: { color: '#FFC107' } }]
      };
    } else {
      return {
        title: { text: `${tab} Report`, left: 'center' },
        tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' } },
        xAxis: { type: 'category' as const, data: xAxisData, axisLabel: { rotate: 45 } },
        yAxis: { type: 'value' },
        series: [{ data: seriesData, type: type, itemStyle: { color: '#FFC107' }, smooth: true }]
      };
    }
  }

  private chartInstance: ECharts | null = null;

  onChartInit(ec: unknown) {
    this.chartInstance = ec as ECharts;
  }

  downloadChart() {
    if (this.chartInstance) {
      const url = this.chartInstance.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#fff'
      });
      const link = document.createElement('a');
      link.href = url;
      link.download = `chart_${this.currentTab()}_${new Date().toISOString().split('T')[0]}.png`;
      link.click();
      this.toast.success('Chart downloaded successfully');
    }
  }

  ngOnInit() {
    this.loading.set(true);
    this.api.getOrders().subscribe({
      next: (d) => {
        console.log('Orders fetched:', d);
        this.orders.set(d);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to fetch orders:', err);
        this.loading.set(false);
      }
    });

    this.api.getDeliveryTeam().subscribe({
      next: (d) => this.drivers.set(d),
      error: () => console.error('Failed to fetch delivery team')
    });
  }

  resetFilters() {
    this.startDate.set('');
    this.endDate.set('');
    this.statusFilter.set('all');
    this.hotelFilter.set('all');
    this.deliveryFilter.set('all');
    this.toast.info('Filters reset');
  }

  exportCSV() {
    const config = this.tableConfig();
    if (!config || !config.rows || config.rows.length === 0) {
      this.toast.error('No data to export');
      return;
    }

    const headers: string[] = config.headers || [];
    const rows: (string | number)[][] = config.rows || [];

    // Add UTF-8 BOM for proper Excel rendering of rupee symbol
    const csvContent = "\ufeff" + [
      headers.map((h: string) => `"${h}"`).join(','),
      ...rows.map((row: (string | number)[]) => row.map((field: string | number) => {
        // Ensure symbols are preserved and fields with commas are quoted correctly
        const value = String(field ?? '');
        return `"${value}"`;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `kallme_report_${this.currentTab()}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.toast.success('CSV exported successfully');
  }

  exportPDF() {
    const config = this.tableConfig();
    if (!config || !config.rows || config.rows.length === 0) {
      this.toast.error('No data to export');
      return;
    }

    const doc = new jsPDF({
      orientation: config.headers.length > 5 ? 'landscape' : 'portrait'
    });
    
    // Title
    doc.setFontSize(20);
    doc.text(`Kall Me - ${this.currentTab()} Report`, 14, 22);
    
    // Filters info
    doc.setFontSize(10);
    doc.setTextColor(100);
    let filterText = `Generated on: ${new Date().toLocaleDateString()}`;
    if (this.startDate() || this.endDate()) {
      filterText += ` | Period: ${this.startDate() || 'Start'} to ${this.endDate() || 'End'}`;
    }
    if (this.statusFilter() !== 'all') filterText += ` | Status: ${this.statusFilter()}`;
    if (this.hotelFilter() !== 'all') filterText += ` | Hotel: ${this.hotelFilter()}`;
    doc.text(filterText, 14, 30);

    // Metrics summary
    const m = this.metrics();
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Summary:`, 14, 40);
    doc.setFontSize(10);
    
    let y = 46;
    if (m && m.items) {
      m.items.forEach((item: { label: string; value: string }) => {
        const sanitizedValue = (item.value || '').replace(/₹/g, 'Rs.');
        doc.text(`${item.label}: ${sanitizedValue}`, 14, y);
        y += 6;
      });
    }

    // Table mapping to replace ₹ with Rs. for PDF compatibility
    const sanitizedRows = config.rows.map((row: (string | number)[]) => 
      row.map((cell: string | number) => String(cell ?? '').replace(/₹/g, 'Rs.'))
    );
    const sanitizedHeaders = config.headers.map((h: string) => String(h ?? '').replace(/₹/g, 'Rs.'));

    // Table
    autoTable(doc, {
      startY: y + 5,
      head: [sanitizedHeaders],
      body: sanitizedRows,
      theme: 'grid',
      headStyles: { fillColor: [255, 193, 7], textColor: [0, 0, 0] },
      styles: { fontSize: config.headers.length > 8 ? 6 : 8 },
      didParseCell: function(data) {
        const raw = data.row.raw as (string | number)[];
        if (raw && raw[1] === 'GRAND TOTAL') {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      }
    });

    const tabName = this.currentTab() || 'report';
    doc.save(`kallme_report_${tabName}_${new Date().toISOString().split('T')[0]}.pdf`);
    this.toast.success('PDF exported successfully');
  }
}


