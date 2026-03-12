import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { SearchService } from '../../services/search.service';
import { ToastService } from '../../services/toast.service';
import { CatalogService, MerchantMenuItem } from '../../services/catalog.service';
import { ApiService } from '../../services/api.service';
import { Hotel, MenuItem, DeliveryPerson, Order } from '../../models';

@Component({
  selector: 'app-create-order',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="h-full overflow-y-auto lg:overflow-hidden p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 custom-scrollbar">
      <!-- Left Panel: Hotel Selection -->
      <div class="lg:col-span-3 flex flex-col gap-4 h-auto lg:h-full">
        <div class="flex flex-col">
          <h2 class="text-lg font-bold text-[#1A1A1A] dark:text-white flex items-center gap-2">
            <div class="w-6 h-6 bg-[#FFC107] rounded flex items-center justify-center">
              <mat-icon class="text-black text-sm">storefront</mat-icon>
            </div>
            Select Merchant
          </h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Choose a partner restaurant</p>
        </div>
        
        <div class="relative">
          <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">filter_list</mat-icon>
          <input 
            type="text" 
            [(ngModel)]="merchantFilter"
            placeholder="Filter merchants..." 
            class="w-full bg-white dark:bg-[#334155] border border-slate-200 dark:border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#FFC107]/20 transition-all dark:text-white"
          >
        </div>

        <div class="flex-1 lg:overflow-y-auto space-y-3 pr-1 custom-scrollbar min-h-[300px] lg:min-h-0">
          @for (merchant of filteredMerchants(); track merchant.id) {
            <div 
              (click)="selectMerchant(merchant)"
              (keydown.enter)="selectMerchant(merchant)"
              tabindex="0"
              class="group cursor-pointer bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-white/5 rounded-xl overflow-hidden transition-all hover:shadow-md"
              [class.border-[#FFC107]]="selectedMerchant()?.id === merchant.id"
              [class.ring-2]="selectedMerchant()?.id === merchant.id"
              [class.ring-[#FFC107]/20]="selectedMerchant()?.id === merchant.id"
            >
              <div class="h-24 overflow-hidden relative">
                <img [src]="merchant.image_url || 'https://picsum.photos/seed/' + merchant.name + '/400/300'" [alt]="merchant.name" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                @if (selectedMerchant()?.id === merchant.id) {
                  <div class="absolute top-2 right-2 w-5 h-5 bg-[#FFC107] rounded-full flex items-center justify-center shadow-lg">
                    <mat-icon class="text-black text-xs font-bold">check</mat-icon>
                  </div>
                }
              </div>
              <div class="p-3">
                <h3 class="font-bold text-sm text-[#1A1A1A] dark:text-white truncate">{{ merchant.name }}</h3>
                <div class="flex items-center gap-1 text-[#FFC107] mt-0.5">
                  <mat-icon class="text-xs">star</mat-icon>
                  <span class="text-xs font-bold">{{ merchant.rating }}</span>
                  <span class="text-[10px] text-slate-400 font-normal ml-1">(4.5)</span>
                </div>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Center Panel: Menu Selection -->
      <div class="lg:col-span-5 flex flex-col gap-4 h-auto lg:h-full">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-bold text-[#1A1A1A] dark:text-white">Menu Selection</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">{{ selectedMerchant()?.name || 'Select a Merchant' }} • {{ filteredMenu().length }} Items Available</p>
          </div>
          @if (cart().length > 0) {
            <span class="bg-[#FFF9E6] text-[#FFC107] text-[10px] font-bold px-2 py-1 rounded border border-[#FFC107]/30 uppercase tracking-wider">
              {{ cart().length }} Items Selected
            </span>
          }
        </div>

        <!-- Category Tabs -->
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

        <div class="flex-1 lg:overflow-y-auto space-y-3 pr-1 custom-scrollbar min-h-[400px] lg:min-h-0">
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
                  <span class="font-bold text-[#FFC107]">₹{{ (item.merchantPrice ?? item.price).toLocaleString() }}</span>
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
                    <span class="text-[10px] font-bold text-slate-400">₹{{ (getQuantity(item) * (item.merchantPrice ?? item.price)).toLocaleString() }}</span>
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
        </div>
      </div>

      <!-- Right Panel: Order Summary -->
      <div class="lg:col-span-4 flex flex-col gap-4 h-auto lg:h-full">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 bg-[#FFC107] rounded flex items-center justify-center">
            <mat-icon class="text-black text-sm">receipt_long</mat-icon>
          </div>
          <h2 class="text-lg font-bold text-[#1A1A1A] dark:text-white uppercase tracking-tight">Order Summary</h2>
        </div>

        <div class="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-white/5 flex-1 flex flex-col overflow-hidden shadow-sm">
          <div class="p-5 space-y-5 lg:overflow-y-auto flex-1 custom-scrollbar">
            <!-- Customer Details -->
            <div class="space-y-3">
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer Details</p>
              <div>
                <label for="customerName" class="text-[10px] font-bold text-slate-500 mb-1 block">Full Name</label>
                <input id="customerName" type="text" [(ngModel)]="customer.name" class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#FFC107] dark:text-white">
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="customerPhone" class="text-[10px] font-bold text-slate-500 mb-1 block">Phone Number</label>
                  <input id="customerPhone" type="text" [(ngModel)]="customer.phone" class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#FFC107] dark:text-white">
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
                <label for="deliveryAddress" class="text-[10px] font-bold text-slate-500 mb-1 block">Delivery Address</label>
                <textarea id="deliveryAddress" [(ngModel)]="customer.address" rows="2" class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#FFC107] resize-none dark:text-white"></textarea>
              </div>
            </div>

            <!-- Logistics -->
            <div class="space-y-3 pt-4 border-t border-slate-100 dark:border-white/5">
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Logistics & Payment</p>
              <div>
                <label for="driverSelect" class="text-[10px] font-bold text-slate-500 mb-1 block">Assign Delivery Driver</label>
                <div class="relative">
                  <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-[#FFC107] text-sm">pedal_bike</mat-icon>
                  <select id="driverSelect" [(ngModel)]="selectedDriverId" class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg pl-10 pr-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#FFC107] appearance-none dark:text-white">
                    <option value="">Select Driver</option>
                    @for (driver of drivers(); track driver.id) {
                      <option [value]="driver.id">{{ driver.name }}</option>
                    }
                  </select>
                  <mat-icon class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">expand_more</mat-icon>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="amountReceived" class="text-[10px] font-bold text-slate-500 mb-1 block">Amount Received</label>
                  <div class="relative">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                    <input id="amountReceived" type="number" [(ngModel)]="amountReceived" class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg pl-7 pr-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#FFC107] dark:text-white">
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
                <span class="text-[#1A1A1A] dark:text-white">₹{{ subtotal().toLocaleString() }}.00</span>
              </div>
              <div class="flex justify-between text-xs font-medium">
                <span class="text-slate-500 flex items-center gap-1">Shipping Fee <mat-icon class="text-[10px] h-3 w-3">edit</mat-icon></span>
                <span class="text-[#1A1A1A] dark:text-white">₹{{ shippingFee }}.00</span>
              </div>
              
              <div class="bg-[#FFF9E6] p-4 rounded-xl flex justify-between items-center mt-3 border border-[#FFC107]/10">
                <span class="text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]">Grand Total</span>
                <span class="text-xl font-display font-black text-[#FFC107]">₹{{ grandTotal().toLocaleString() }}.00</span>
              </div>

              <div class="flex flex-col gap-1 pt-3">
                <div class="flex justify-between items-center">
                  <span class="text-[10px] font-bold text-slate-500">Amount Received</span>
                  <span class="text-xs font-bold text-[#1A1A1A] dark:text-white">₹{{ amountReceived.toLocaleString() }}.00</span>
                </div>
                <div class="h-px bg-slate-100 border-dashed border-t w-full my-1"></div>
                <div class="flex justify-between items-center">
                  <div class="flex flex-col">
                    <span class="text-[10px] font-bold text-red-500 uppercase tracking-tighter">Balance Pending</span>
                    <span class="text-[8px] text-slate-400">To be received</span>
                  </div>
                  <span class="text-lg font-black text-red-500">₹{{ balancePending().toLocaleString() }}.00</span>
                </div>
              </div>
            </div>
          </div>

          <div class="p-5 bg-white dark:bg-[#1E293B] border-t border-slate-100 dark:border-white/5">
            <button 
              (click)="confirmOrder()"
              [disabled]="!canConfirm()"
              class="w-full bg-[#FFC107] hover:bg-[#FFA000] disabled:bg-slate-200 dark:disabled:bg-white/5 disabled:text-slate-400 text-black font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-[#FFC107]/20"
            >
              <mat-icon>check_circle</mat-icon>
              CONFIRM & DISPATCH ORDER
            </button>
            <p class="text-[8px] text-center text-slate-400 uppercase tracking-widest mt-3 font-bold italic">Order will be dispatched immediately to merchant</p>
          </div>
        </div>
      </div>
    </div>
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
  
  drivers = signal<DeliveryPerson[]>([]);
  selectedMerchant = signal<Hotel | null>(null);
  selectedCategory = signal<string>('All Items');
  categories = ['All Items', 'Veg', 'Non-Veg', 'Beverage', 'Dessert'];
  
  merchantFilter = signal<string>('');
  
  cart = signal<{ item: MerchantMenuItem; quantity: number }[]>([]);
  customer = { 
    name: 'Amit Patel', 
    phone: '+91 98765 43210', 
    type: 'Premium' as const, 
    address: 'Apartment 402, Skyline Residency, Bandra West, Mumbai, 400050' 
  };
  selectedDriverId = '';
  amountReceived = 0;
  shippingFee = 80;

  subtotal = computed(() => this.cart().reduce((acc, entry) => acc + ((entry.item.merchantPrice ?? entry.item.price) * entry.quantity), 0));
  grandTotal = computed(() => this.subtotal() + this.shippingFee);
  balancePending = computed(() => Math.max(0, this.grandTotal() - this.amountReceived));

  filteredMerchants = computed(() => {
    const filter = this.merchantFilter().toLowerCase();
    const globalSearch = this.search.searchTerm().toLowerCase();
    return this.catalog.merchants().filter(m => 
      m.name.toLowerCase().includes(filter) && 
      m.name.toLowerCase().includes(globalSearch)
    );
  });

  filteredMenu = computed(() => {
    const cat = this.selectedCategory();
    const hotel = this.selectedMerchant();
    if (!hotel) return [];
    
    const items = this.catalog.merchantMenus()[hotel.id] || [];
    if (cat === 'All Items') return items;
    return items.filter(i => i.category === cat);
  });

  ngOnInit() {
    this.api.getDeliveryTeam().subscribe(d => this.drivers.set(d));
    // Select first merchant by default if available
    const merchants = this.catalog.merchants();
    if (merchants.length > 0) {
      this.selectMerchant(merchants[0]);
    }
  }

  selectMerchant(merchant: Hotel) {
    this.selectedMerchant.set(merchant);
    this.catalog.loadMerchantMenu(merchant.id);
    this.cart.set([]);
  }

  getQuantity(item: MerchantMenuItem): number {
    const entry = this.cart().find(e => e.item.id === item.id);
    return entry?.quantity || 0;
  }

  updateQuantity(item: MerchantMenuItem, delta: number) {
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

  canConfirm(): boolean {
    return this.cart().length > 0 && !!this.selectedMerchant() && !!this.customer.name && !!this.customer.phone;
  }

  confirmOrder() {
    if (!this.canConfirm()) return;
    
    const hotel = this.selectedMerchant()!;
    const orderData: Partial<Order> = {
      hotel_id: hotel.id,
      hotel_name: hotel.name,
      delivery_person_id: 1, // Default driver
      customer_name: this.customer.name,
      customer_phone: this.customer.phone,
      customer_type: 'regular',
      delivery_address: this.customer.address || 'Pickup',
      subtotal: this.subtotal(),
      shipping_fee: this.shippingFee,
      grand_total: this.grandTotal(),
      amount_received: this.amountReceived,
      balance_pending: this.balancePending(),
      status: 'placed',
      items: this.cart().map(c => {
        const price = c.item.merchantPrice ?? c.item.price;
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
        this.amountReceived = 0;
      },
      error: (err) => {
        console.error('Order creation failed:', err);
        this.toast.error('Failed to place order: ' + (err.error?.message || err.message));
      }
    });
  }
}
