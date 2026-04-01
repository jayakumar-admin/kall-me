import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { SearchService } from '../../services/search.service';
import { ToastService } from '../../services/toast.service';
import { CatalogService, HotelMenuItem } from '../../services/catalog.service';
import { ApiService } from '../../services/api.service';
import { Hotel, DeliveryPerson, Order } from '../../models';

import { OrderService } from '../../services/order.service';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-create-order',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="h-full overflow-hidden p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- Left Panel: Hotel Selection -->
      <div class="lg:col-span-3 flex flex-col gap-4 h-full overflow-hidden">
        <div class="flex flex-col shrink-0">
          <h2 class="text-lg font-bold text-[#1A1A1A] dark:text-white flex items-center gap-2">
            <div class="w-6 h-6 bg-[#FFC107] rounded flex items-center justify-center">
              <mat-icon class="text-black text-sm">storefront</mat-icon>
            </div>
            Select Hotel
          </h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Choose a partner restaurant</p>
        </div>
        
        <div class="relative shrink-0">
          <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">filter_list</mat-icon>
          <input 
            type="text" 
            [(ngModel)]="hotelFilter"
            placeholder="Filter hotels..." 
            class="w-full bg-white dark:bg-[#334155] border border-slate-200 dark:border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#FFC107]/20 transition-all dark:text-white"
          >
        </div>

        <div class="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
          @for (hotel of filteredHotels(); track hotel.id) {
            <div 
              (click)="selectHotel(hotel)"
              (keydown.enter)="selectHotel(hotel)"
              tabindex="0"
              class="group cursor-pointer bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-white/5 rounded-xl overflow-hidden transition-all hover:shadow-md"
              [class.border-[#FFC107]]="selectedHotel()?.id === hotel.id"
              [class.ring-2]="selectedHotel()?.id === hotel.id"
              [class.ring-[#FFC107]/20]="selectedHotel()?.id === hotel.id"
            >
              <div class="h-24 overflow-hidden relative">
                <img [src]="hotel.image_url || 'https://picsum.photos/seed/' + hotel.name + '/400/300'" [alt]="hotel.name" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                @if (selectedHotel()?.id === hotel.id) {
                  <div class="absolute top-2 right-2 w-5 h-5 bg-[#FFC107] rounded-full flex items-center justify-center shadow-lg">
                    <mat-icon class="text-black text-xs font-bold">check</mat-icon>
                  </div>
                }
              </div>
              <div class="p-3">
                <h3 class="font-bold text-sm text-[#1A1A1A] dark:text-white truncate">{{ hotel.name }}</h3>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Center Panel: Menu Selection -->
      <div class="lg:col-span-5 flex flex-col gap-4 h-full overflow-hidden">
        <div class="flex items-center justify-between shrink-0">
          <div>
            <h2 class="text-xl font-bold text-[#1A1A1A] dark:text-white">Menu Selection</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">{{ selectedHotel()?.name || 'Select a Hotel' }} • {{ filteredMenu().length }} Items Available</p>
          </div>
          @if (cart().length > 0) {
            <span class="bg-[#FFF9E6] text-[#FFC107] text-[10px] font-bold px-2 py-1 rounded border border-[#FFC107]/30 uppercase tracking-wider">
              {{ cart().length }} Items Selected
            </span>
          }
        </div>

        <!-- Category Tabs & Search -->
        <div class="flex flex-col gap-3 shrink-0">
          <div class="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            @for (cat of categories; track cat) {
              <button 
                (click)="selectedCategory.set(cat)"
                [class.bg-[#FFC107]]="selectedCategory() === cat"
                [class.text-black]="selectedCategory() === cat"
                [class.bg-white]="selectedCategory() !== cat"
                [class.dark:bg-[#1E293B]]="selectedCategory() !== cat"
                [class.text-slate-600]="selectedCategory() !== cat"
                [class.dark:text-slate-400]="selectedCategory() !== cat"
                class="px-5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all shadow-sm border border-slate-100 dark:border-white/5"
              >
                {{ cat }}
              </button>
            }
          </div>
          <div class="relative">
            <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</mat-icon>
            <input 
              type="text" 
              [ngModel]="menuSearchTerm()"
              (ngModelChange)="menuSearchTerm.set($event)"
              placeholder="Search menu items..." 
              class="w-full bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#FFC107]/20 transition-all dark:text-white"
            >
          </div>
        </div>

        <div class="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
          @if (selectedHotel()?.id !== -1) {
            @for (item of filteredMenu(); track item.id) {
              <div 
                class="bg-white dark:bg-[#1E293B] rounded-xl border border-slate-100 dark:border-white/5 p-3 flex gap-4 items-center group transition-all hover:border-[#FFC107]/30"
                [class.border-[#FFC107]]="getQuantity(item) > 0"
                [class.bg-[#FFF9E6]/20]="getQuantity(item) > 0"
              >
                <div class="relative">
                  <div class="w-16 h-16 rounded-lg overflow-hidden shrink-0">
                    <img [src]="item.image_url || 'https://picsum.photos/seed/' + item.name + '/100/100'" [alt]="item.name" class="w-full h-full object-cover">
                  </div>
                  @if (getQuantity(item) > 0) {
                    <div class="absolute -top-1 -left-1 w-5 h-5 bg-[#FFC107] rounded-full flex items-center justify-center shadow-sm">
                      <mat-icon class="text-black text-xs font-bold">check</mat-icon>
                    </div>
                  }
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex justify-between items-start">
                    <h4 class="font-bold text-sm text-[#1A1A1A] dark:text-white truncate">{{ item.name }}</h4>
                    <span class="font-bold text-[#FFC107]">₹{{ ((item.hotelPrice ?? item.price) || 0).toLocaleString() }}</span>
                  </div>
                  <p class="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{{ item.description }}</p>
                  
                  <div class="flex items-center justify-between mt-2">
                    <div class="flex items-center bg-slate-100 dark:bg-[#0F172A] rounded-lg p-0.5">
                      <button (click)="updateQuantity(item, -1)" class="w-7 h-7 flex items-center justify-center hover:bg-white dark:hover:bg-[#1E293B] rounded-md transition-colors text-slate-500">
                        <mat-icon class="text-sm">remove</mat-icon>
                      </button>
                      <span class="w-8 text-center text-xs font-bold text-[#1A1A1A] dark:text-white">{{ getQuantity(item) }}</span>
                      <button (click)="updateQuantity(item, 1)" class="w-7 h-7 flex items-center justify-center bg-[#FFC107] text-black rounded-md shadow-sm transition-transform active:scale-90">
                        <mat-icon class="text-sm">add</mat-icon>
                      </button>
                    </div>
                    @if (getQuantity(item) > 0) {
                      <span class="text-[10px] font-bold text-slate-400">₹{{ ((getQuantity(item) * (item.hotelPrice ?? item.price)) || 0).toLocaleString() }}</span>
                    }
                  </div>
                </div>
              </div>
            } @empty {
              <div class="py-12 text-center">
                <mat-icon class="text-4xl text-slate-300 mb-2">restaurant_menu</mat-icon>
                <p class="text-slate-500">No items found for this category.</p>
              </div>
            }
          } @else {
            <div class="py-12 text-center">
              <mat-icon class="text-4xl text-slate-300 mb-2">info</mat-icon>
              <p class="text-slate-500">Menu selection is disabled for 'Manual Order'.</p>
            </div>
          }
        </div>
      </div>

      <!-- Right Panel: Order Summary -->
      <div class="lg:col-span-4 flex flex-col gap-4 h-full overflow-hidden">
        <div class="flex items-center gap-2 shrink-0">
          <div class="w-6 h-6 bg-[#FFC107] rounded flex items-center justify-center">
            <mat-icon class="text-black text-sm">receipt_long</mat-icon>
          </div>
          <h2 class="text-lg font-bold text-[#1A1A1A] dark:text-white uppercase tracking-tight">Order Summary</h2>
        </div>

        <div class="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-white/5 flex-1 flex flex-col overflow-hidden shadow-sm">
          <div class="p-5 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
            <!-- Order Details -->
            <div class="space-y-3">
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Order Details</p>
              <div class="bg-slate-50 dark:bg-[#0F172A] p-3 rounded-lg border border-slate-100 dark:border-white/5">
                <span class="text-[10px] font-bold text-slate-500 block">OrderID</span>
                <span class="text-sm font-bold text-[#1A1A1A] dark:text-white">{{ orderId() }}</span>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="customerPhone" class="text-[10px] font-bold text-slate-500 mb-1 block">Phone Number <span class="text-red-500">*</span></label>
                  <div class="relative">
                    <input id="customerPhone" type="text" [(ngModel)]="customer.phone" class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#FFC107] dark:text-white">
                    <mat-icon (click)="sendCustomerInvoice(customer.phone)" class="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 text-sm cursor-pointer">chat</mat-icon>
                  </div>
                </div>
                <div>
                  <label for="customerType" class="text-[10px] font-bold text-slate-500 mb-1 block">Customer Type</label>
                  <select id="customerType" [(ngModel)]="customer.type" class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#FFC107] dark:text-white">
                    <option value="Regular">Regular Member</option>
                    <option value="Premium">Premium Member</option>
                  </select>
                </div>
              </div>
              <div>
                <label for="customerAddress" class="text-[10px] font-bold text-slate-500 mb-1 block">Delivery Address <span class="text-red-500">*</span></label>
                <textarea id="customerAddress" [(ngModel)]="customer.address" rows="2" class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#FFC107] resize-none dark:text-white"></textarea>
              </div>
              <div>
                <label for="deliveryDescription" class="text-[10px] font-bold text-slate-500 mb-1 block">Description / Notes <span class="text-red-500">*</span></label>
                <textarea id="deliveryDescription" [(ngModel)]="customer.description" rows="4" class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#FFC107] resize-none dark:text-white"></textarea>
              </div>
              @if (selectedHotel()?.id === -1) {
                <div>
                  <label for="manualPrice" class="text-[10px] font-bold text-slate-500 mb-1 block">Manual Price <span class="text-red-500">*</span></label>
                  <input id="manualPrice" type="number" [ngModel]="manualPrice()" (ngModelChange)="manualPrice.set($event)" class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#FFC107] dark:text-white">
                </div>
              }
            </div>

            <!-- Logistics -->
            <div class="space-y-3 pt-4 border-t border-slate-100 dark:border-white/5">
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Logistics & Payment</p>
              <div>
                <span class="text-[10px] font-bold text-slate-500 mb-1 block">Assign Delivery Driver <span class="text-red-500">*</span></span>
                <div 
                  (click)="openDriverModal()"
                  (keydown.enter)="openDriverModal()"
                  tabindex="0"
                  class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg p-3 cursor-pointer hover:border-[#FFC107]/50 transition-colors flex items-center justify-between"
                >
                  <div class="flex items-center gap-3">
                    @if (selectedDriver()) {
                      <div class="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                        <img [src]="selectedDriver()?.image_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + selectedDriver()?.name" alt="">
                      </div>
                      <div class="flex flex-col">
                        <span class="text-sm font-bold text-[#1A1A1A] dark:text-white">{{ selectedDriver()?.name }}</span>
                        <span class="text-[10px] text-slate-500">{{ selectedDriver()?.mobile }}</span>
                      </div>
                    } @else {
                      <div class="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                        <mat-icon class="text-slate-400 text-sm">pedal_bike</mat-icon>
                      </div>
                      <span class="text-sm text-slate-500">Select a driver</span>
                    }
                  </div>
                  <mat-icon class="text-slate-400 text-sm">chevron_right</mat-icon>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="amountReceived" class="text-[10px] font-bold text-slate-500 mb-1 block">Amount Received</label>
                  <div class="relative">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                    <input id="amountReceived" type="number" [ngModel]="amountReceived()" (ngModelChange)="amountReceived.set($event)" class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg pl-7 pr-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#FFC107] dark:text-white">
                  </div>
                </div>
                <div>
                  <label for="balanceReceived" class="text-[10px] font-bold text-slate-500 mb-1 block">Balance Received</label>
                  <div class="relative">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                    <input id="balanceReceived" type="number" [value]="0" disabled class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg pl-7 pr-3 py-2 text-sm outline-none opacity-50 dark:text-white">
                  </div>
                </div>
              </div>
            </div>

            <!-- Pricing -->
            <div class="space-y-2 pt-4 border-t border-slate-100">
              <div class="flex justify-between text-xs font-medium">
                <span class="text-slate-500">Food Subtotal</span>
                <span class="text-[#1A1A1A] dark:text-white">₹{{ (subtotal() || 0).toLocaleString() }}.00</span>
              </div>
              <div class="flex justify-between items-center text-xs font-medium">
                <span class="text-slate-500 flex items-center gap-1">Delivery Charges (DC)</span>
                <div class="relative w-24">
                  <span class="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input type="number" [ngModel]="shippingFee()" (ngModelChange)="onShippingFeeChange($event)" class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg pl-6 pr-2 py-1 text-right text-sm outline-none focus:ring-1 focus:ring-[#FFC107] dark:text-white">
                </div>
              </div>
              
              <div class="bg-[#FFF9E6] p-4 rounded-xl flex justify-between items-center mt-3 border border-[#FFC107]/10">
                <span class="text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]">Grand Total</span>
                <span class="text-xl font-display font-black text-[#FFC107]">₹{{ (grandTotal() || 0).toLocaleString() }}.00</span>
              </div>

              <div class="flex flex-col gap-1 pt-3">
                <div class="flex justify-between items-center">
                  <span class="text-[10px] font-bold text-slate-500">Amount Received</span>
                  <span class="text-xs font-bold text-[#1A1A1A] dark:text-white">₹{{ (amountReceived() || 0).toLocaleString() }}.00</span>
                </div>
                <div class="h-px bg-slate-100 border-dashed border-t w-full my-1"></div>
                <div class="flex justify-between items-center">
                  <div class="flex flex-col">
                    <span class="text-[10px] font-bold text-red-500 uppercase tracking-tighter">Balance Pending</span>
                    <span class="text-[8px] text-slate-400">To be received</span>
                  </div>
                  <span class="text-lg font-black text-red-500">₹{{ (balancePending() || 0).toLocaleString() }}.00</span>
                </div>
              </div>
            </div>
          </div>

          <div class="p-5 bg-white dark:bg-[#1E293B] border-t border-slate-100 dark:border-white/5 shrink-0">
            @if (!canConfirm()) {
              <p class="text-[10px] text-red-500 text-center mb-3 font-bold uppercase tracking-wider">Please fill all required fields to confirm</p>
            }
            <button 
              (click)="confirmOrder()"
              [disabled]="!canConfirm()"
              class="w-full bg-[#FFC107] hover:bg-[#FFA000] disabled:bg-slate-200 dark:disabled:bg-white/5 disabled:text-slate-400 text-black font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-[#FFC107]/20"
            >
              <mat-icon>check_circle</mat-icon>
              CONFIRM & DISPATCH ORDER
            </button>
            <p class="text-[8px] text-center text-slate-400 uppercase tracking-widest mt-3 font-bold italic">Order will be dispatched immediately to hotel</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Driver Selection Modal -->
    @if (showDriverModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div class="bg-white dark:bg-[#1E293B] rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl border border-slate-100 dark:border-white/10 animate-in fade-in zoom-in duration-200">
          <div class="p-6 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
            <h2 class="text-xl font-bold text-slate-900 dark:text-white">Select Driver</h2>
            <button (click)="showDriverModal.set(false)" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          
          <div class="p-4 border-b border-slate-100 dark:border-white/10">
            <div class="relative">
              <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</mat-icon>
              <input 
                type="text" 
                [ngModel]="driverSearchTerm()"
                (ngModelChange)="driverSearchTerm.set($event)"
                placeholder="Search drivers..." 
                class="w-full bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#FFC107]/20 transition-all dark:text-white"
              >
            </div>
          </div>

          <div class="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
            @for (driver of filteredDrivers(); track driver.id) {
              <div 
                (click)="selectDriver(driver)"
                (keydown.enter)="selectDriver(driver)"
                tabindex="0"
                class="flex items-center gap-4 p-3 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 cursor-pointer hover:border-[#FFC107]/50 transition-all"
                [class.border-[#FFC107]]="selectedDriverId() === driver.id.toString()"
                [class.bg-[#FFF9E6]/20]="selectedDriverId() === driver.id.toString()"
              >
                <div class="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                  <img [src]="driver.image_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + driver.name" alt="">
                </div>
                <div class="flex-1 min-w-0">
                  <h4 class="font-bold text-slate-900 dark:text-white truncate">{{ driver.name }}</h4>
                  <p class="text-xs text-slate-500 truncate">{{ driver.mobile }}</p>
                </div>
                <div class="shrink-0">
                  <span 
                    [class]="driver.status === 'active' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 
                             driver.status === 'busy' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 
                             'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'"
                    class="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                  >
                    {{ driver.status }}
                  </span>
                </div>
              </div>
            } @empty {
              <div class="py-8 text-center">
                <mat-icon class="text-4xl text-slate-300 mb-2">person_off</mat-icon>
                <p class="text-slate-500">No drivers found.</p>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateOrder implements OnInit {
  search = inject(SearchService);
  toast = inject(ToastService);
  catalog = inject(CatalogService);
  api = inject(ApiService);
  orderService = inject(OrderService);
  settingsService = inject(SettingsService);
  router = inject(Router);
  
  drivers = signal<DeliveryPerson[]>([]);
  selectedHotel = signal<Hotel | null>(null);
  selectedCategory = signal<string>('All Items');
  categories = ['All Items', 'Veg', 'Non-Veg', 'Beverage', 'Dessert'];
  
  hotelFilter = signal<string>('');
  
  cart = signal<{ item: HotelMenuItem; quantity: number }[]>([]);
  customer = { 
    name: '',
    phone: '', 
    type: 'Regular' as const, 
    address: '',
    description: '' 
  };
  orderId = signal<string>('');
  selectedDriverId = signal<string>('');
  showDriverModal = signal(false);
  driverSearchTerm = signal('');

  filteredDrivers = computed(() => {
    const term = this.driverSearchTerm().toLowerCase();
    return this.drivers().filter(d => 
      d.name.toLowerCase().includes(term) || 
      d.mobile.includes(term)
    );
  });

  selectedDriver = computed(() => {
    return this.drivers().find(d => d.id === Number(this.selectedDriverId())) || null;
  });

  openDriverModal() {
    this.showDriverModal.set(true);
    this.driverSearchTerm.set('');
  }

  selectDriver(driver: DeliveryPerson) {
    this.selectedDriverId.set(String(driver.id));
    this.showDriverModal.set(false);
  }

  amountReceived = signal<number>(0);
  shippingFee = signal<number>(0);
  manualPrice = signal<number>(0);
  isShippingManuallyEdited = signal<boolean>(false);

  onShippingFeeChange(value: number) {
    this.shippingFee.set(value);
    this.isShippingManuallyEdited.set(true);
  }

  subtotal = computed(() => {
    if (this.selectedHotel()?.id === -1) return this.manualPrice();
    return this.cart().reduce((acc, entry) => acc + ((entry.item.hotelPrice ?? entry.item.price) * entry.quantity), 0);
  });
  grandTotal = computed(() => Number(this.subtotal()) + Number(this.shippingFee() || 0));
  balancePending = computed(() => Math.max(0, Number(this.grandTotal()) - Number(this.amountReceived() || 0)));

  filteredHotels = computed(() => {
    const filter = this.hotelFilter().toLowerCase();
    const globalSearch = this.search.searchTerm().toLowerCase();
    const othersHotel: Hotel = { 
      id: -1, 
      name: 'Manual Order', 
      address: '', 
      category: 'Manual Order', 
      rating: 0, 
      commission_rate: 0, 
      image_url: '', 
      status: 'active' 
    };
    const hotels = [othersHotel, ...this.catalog.hotels()];
    return hotels.filter(h => 
      h.name.toLowerCase().includes(filter) && 
      h.name.toLowerCase().includes(globalSearch)
    );
  });

  menuSearchTerm = signal('');

  filteredMenu = computed(() => {
    const cat = this.selectedCategory();
    const hotel = this.selectedHotel();
    const term = this.menuSearchTerm().toLowerCase();
    
    if (!hotel) return [];
    
    let hotelItems = this.catalog.hotelMenus()[hotel.id] || [];
    
    if (cat !== 'All Items') {
      hotelItems = hotelItems.filter(i => i.category === cat);
    }
    
    // Filter to only show linked menus
    hotelItems = hotelItems.filter(i => i.isLinked);
    
    if (term) {
      hotelItems = hotelItems.filter(i => 
        i.name.toLowerCase().includes(term) || 
        (i.category && i.category.toLowerCase().includes(term))
      );
    }
    
    return hotelItems;
  });

  route = inject(ActivatedRoute);

  constructor() {
    effect(() => {
      const sub = this.subtotal();
      const ranges = this.settingsService.shippingRanges();
      if (!this.isShippingManuallyEdited()) {
        let fee = 0;
        if (ranges && ranges.length > 0) {
          const range = ranges.find(r => sub >= r.min_amount && sub < r.max_amount);
          if (range) fee = range.price;
        }
        this.shippingFee.set(fee);
      }
    }, { allowSignalWrites: true });

    effect(() => {
      const hotels = this.catalog.hotels();
      const hotelId = this.route.snapshot.queryParams['hotelId'];
      
      if (hotels.length > 0 && !this.selectedHotel()) {
        if (hotelId) {
          const selected = hotels.find(h => h.id === Number(hotelId));
          if (selected) {
            this.selectHotel(selected);
            return;
          }
        }
        this.selectHotel(hotels[0]);
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit() {
    this.api.getDeliveryTeam().subscribe(d => this.drivers.set(d));
    this.orderId.set(`ORD-${Math.floor(100000 + Math.random() * 900000)}`);
  }

  selectHotel(hotel: Hotel) {
    this.selectedHotel.set(hotel);
    if (hotel.id !== -1) {
      this.catalog.loadHotelMenu(hotel.id);
    }
    this.cart.set([]);
  }

  getQuantity(item: HotelMenuItem): number {
    const entry = this.cart().find(e => e.item.id === item.id);
    return entry?.quantity || 0;
  }

  updateQuantity(item: HotelMenuItem, delta: number) {
    this.cart.update(current => {
      const existingIndex = current.findIndex(e => e.item.id === item.id);
      if (existingIndex > -1) {
        const newQty = current[existingIndex].quantity + delta;
        if (newQty <= 0) {
          return current.filter(e => e.item.id !== item.id);
        }
        const updated = [...current];
        updated[existingIndex] = { ...updated[existingIndex], quantity: newQty };
        return updated;
      } else if (delta > 0) {
        return [...current, { item, quantity: 1 }];
      }
      return current;
    });
  }

  sendCustomerInvoice(phone: string) {
    const params = {
      OrderNumber: this.orderId(),
      HotelName: this.selectedHotel()?.name || 'Unknown',
      MenuItems: this.cart().map(c => c.item.name).join(', '),
      GrandTotal: this.grandTotal(),
      InvoiceUrl: 'https://kallme.com/invoice/123'
    };
    this.api.sendWhatsApp(phone, 'CUSTOMER_INVOICE', params).subscribe({
      next: () => this.toast.success('Invoice sent via WhatsApp'),
      error: () => this.toast.error('Failed to send invoice')
    });
  }

  canConfirm(): boolean {
    const isOthers = this.selectedHotel()?.id === -1;
    return (this.cart().length > 0 || isOthers) && 
           !!this.selectedHotel() && 
           !!this.customer.phone?.trim() && 
           !!this.customer.address?.trim() &&
           !!this.selectedDriverId() &&
           (!isOthers || (!!this.customer.description?.trim() && this.manualPrice() > 0));
  }

  confirmOrder() {
    if (!this.canConfirm()) return;
    
    const hotel = this.selectedHotel()!;
    const orderData: Partial<Order> = {
      order_number: this.orderId(),
      hotel_id: hotel.id,
      hotel_name: hotel.name,
      delivery_person_id: Number(this.selectedDriverId()) || 1, // Default driver
      customer_phone: this.customer.phone,
      customer_type: 'regular',
      delivery_address: this.customer.address,
      delivery_description: this.customer.description,
      subtotal: this.subtotal(),
      shipping_fee: this.shippingFee(),
      grand_total: this.grandTotal(),
      amount_received: this.amountReceived(),
      balance_pending: this.balancePending(),
      status: 'Order Placed',
      items: this.cart().map(c => {
        const price = c.item.hotelPrice ?? c.item.price;
        return {
          menu_id: c.item.id,
          menu_name: c.item.name,
          quantity: c.quantity,
          price: price,
          total: c.quantity * price
        };
      })
    };

    console.log('Sending order data:', orderData);

    this.api.createOrder(orderData).subscribe({
      next: (order) => {
        this.toast.success(`Order #${order.order_number} confirmed successfully!`);
        this.cart.set([]);
        this.amountReceived.set(0);
        this.orderService.loadOrders();
        this.router.navigate(['/app/orders']);
      },
      error: (err) => {
        console.error('Order creation failed:', err);
        this.toast.error('Failed to place order: ' + (err.error?.message || err.message));
      }
    });
  }
}
