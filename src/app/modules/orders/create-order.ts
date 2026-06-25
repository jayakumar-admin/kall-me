import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
  OnInit,
  effect,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { ActivatedRoute, Router } from "@angular/router";
import { SearchService } from "../../services/search.service";
import { ToastService } from "../../services/toast.service";
import { CatalogService, HotelMenuItem } from "../../services/catalog.service";
import { ApiService } from "../../services/api.service";
import { Hotel, DeliveryPerson, Order } from "../../models";

import { OrderService } from "../../services/order.service";
import { SettingsService } from "../../services/settings.service";
import { InvoiceService } from "../../services/invoice.service";

@Component({
  selector: "app-create-order",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div
      class="h-full overflow-y-auto lg:overflow-hidden p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6"
    >
      <!-- Mobile Stepper Header -->
      <div
        class="lg:hidden col-span-1 bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-white/5 rounded-2xl p-3 shadow-sm shrink-0"
      >
        <div class="flex items-center justify-between">
          <!-- Step 1 Trigger -->
          <button
            type="button"
            (click)="currentStep.set(1)"
            class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all"
            [class.bg-[#FFC107]/10]="currentStep() === 1"
            [class.text-[#FFC107]]="currentStep() === 1"
            [class.text-slate-400]="currentStep() !== 1"
          >
            <div
              class="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black transition-all"
              [class.bg-[#FFC107]]="currentStep() === 1"
              [class.text-black]="currentStep() === 1"
              [class.bg-slate-100]="currentStep() !== 1"
              [class.dark:bg-slate-800]="currentStep() !== 1"
            >
              1
            </div>
            <span class="text-xs font-black uppercase tracking-wider"
              >Hotel & Items</span
            >
          </button>

          <!-- Divider line -->
          <div
            class="w-8 h-[2px] bg-slate-100 dark:bg-slate-800 shrink-0 mx-1"
          ></div>

          <!-- Step 2 Trigger -->
          <button
            type="button"
            (click)="currentStep.set(2)"
            class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all"
            [class.bg-[#FFC107]/10]="currentStep() === 2"
            [class.text-[#FFC107]]="currentStep() === 2"
            [class.text-slate-400]="currentStep() !== 2"
          >
            <div
              class="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black transition-all"
              [class.bg-[#FFC107]]="currentStep() === 2"
              [class.text-black]="currentStep() === 2"
              [class.bg-slate-100]="currentStep() !== 2"
              [class.dark:bg-slate-800]="currentStep() !== 2"
            >
              2
            </div>
            <span class="text-xs font-black uppercase tracking-wider"
              >Details & Pay</span
            >
          </button>
        </div>
      </div>

      <!-- Left Panel: Hotel Selection -->
      <div
        [class.hidden]="currentStep() !== 1"
        class="lg:col-span-3 lg:flex flex flex-col gap-4 lg:h-full lg:overflow-hidden shrink-0"
      >
        <div class="flex flex-col shrink-0">
          <h2
            class="text-lg font-bold text-[#1A1A1A] dark:text-white flex items-center gap-2"
          >
            <div
              class="w-6 h-6 bg-[#FFC107] rounded flex items-center justify-center"
            >
              <mat-icon class="text-black text-sm">storefront</mat-icon>
            </div>
            Select Hotel
          </h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Choose a partner restaurant
          </p>
        </div>

        <div class="relative shrink-0">
          <mat-icon
            class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"
            >filter_list</mat-icon
          >
          <input
            type="text"
            [(ngModel)]="hotelFilter"
            placeholder="Filter hotels..."
            class="w-full bg-white dark:bg-[#334155] border border-slate-200 dark:border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#FFC107]/20 transition-all dark:text-white"
          />
        </div>

        <div
          class="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto lg:space-y-3 lg:space-x-0 pb-2 lg:pb-0 pr-1 custom-scrollbar"
        >
          @for (hotel of filteredHotels(); track hotel.id) {
            <div
              (click)="selectHotel(hotel)"
              (keydown.enter)="selectHotel(hotel)"
              tabindex="0"
              class="group cursor-pointer bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-white/5 rounded-xl overflow-hidden transition-all hover:shadow-md shrink-0 w-32 lg:w-auto"
              [class.border-[#FFC107]]="selectedHotel()?.id === hotel.id"
              [class.ring-2]="selectedHotel()?.id === hotel.id"
              [class.ring-[#FFC107]/20]="selectedHotel()?.id === hotel.id"
            >
              <div class="hidden lg:block h-24 overflow-hidden relative">
                <img
                  [src]="
                    hotel.image_url ||
                    'https://picsum.photos/seed/' + hotel.name + '/400/300'
                  "
                  [alt]="hotel.name"
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                @if (selectedHotel()?.id === hotel.id) {
                  <div
                    class="absolute top-2 right-2 w-5 h-5 bg-[#FFC107] rounded-full flex items-center justify-center shadow-lg"
                  >
                    <mat-icon class="text-black text-xs font-bold"
                      >check</mat-icon
                    >
                  </div>
                }
              </div>
              @if (selectedHotel()?.id === hotel.id) {
                <div
                  class="lg:hidden absolute top-1 right-1 w-4 h-4 bg-[#FFC107] rounded-full flex items-center justify-center shadow-sm"
                >
                  <mat-icon class="text-black text-[10px] font-bold"
                    >check</mat-icon
                  >
                </div>
              }
              <div class="p-2 lg:p-3 text-center lg:text-left">
                <h3
                  class="font-bold text-xs lg:text-sm text-[#1A1A1A] dark:text-white truncate"
                >
                  {{ hotel.name }}
                </h3>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Center Panel: Menu Selection -->
      <div
        [class.hidden]="currentStep() !== 1"
        class="lg:col-span-5 lg:flex flex flex-col gap-4 lg:h-full lg:overflow-hidden min-h-[400px]"
      >
        <div class="flex items-center justify-between shrink-0">
          <div>
            <h2 class="text-xl font-bold text-[#1A1A1A] dark:text-white">
              Menu Selection
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              {{ selectedHotel()?.name || "Select a Hotel" }} •
              {{ filteredMenu().length }} Items Available
            </p>
          </div>
          @if (cart().length > 0) {
            <span
              class="bg-[#FFF9E6] text-[#FFC107] text-[10px] font-bold px-2 py-1 rounded border border-[#FFC107]/30 uppercase tracking-wider"
            >
              {{ cart().length }} Items Selected
            </span>
          }
        </div>

        <!-- Category Tabs & Search -->
        <div class="flex flex-col gap-3 shrink-0">
          <div class="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
            @for (cat of categoriesInfo(); track cat.name) {
              <button
                (click)="selectedCategory.set(cat.name)"
                [class.bg-[#FFC107]]="activeCategory() === cat.name"
                [class.text-black]="activeCategory() === cat.name"
                [class.bg-white]="activeCategory() !== cat.name"
                [class.dark:bg-[#1E293B]]="activeCategory() !== cat.name"
                [class.text-slate-600]="activeCategory() !== cat.name"
                [class.dark:text-slate-400]="activeCategory() !== cat.name"
                class="px-5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all shadow-sm border border-slate-100 dark:border-white/5 flex items-center gap-1.5"
              >
                <span>{{ cat.name }}</span>
                <span class="text-[10px] opacity-70">({{ cat.count }})</span>
                @if (cat.selectedSum > 0) {
                  <span
                    class="text-[10px] font-black bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded-md ml-1"
                    >₹{{ cat.selectedSum.toLocaleString() }}</span
                  >
                }
              </button>
            }
          </div>
          <div class="relative">
            <mat-icon
              class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"
              >search</mat-icon
            >
            <input
              type="text"
              [ngModel]="menuSearchTerm()"
              (ngModelChange)="menuSearchTerm.set($event)"
              placeholder="Search menu items..."
              class="w-full bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#FFC107]/20 transition-all dark:text-white"
            />
          </div>
        </div>

        <div
          class="flex-1 overflow-y-auto grid grid-cols-2 lg:grid-cols-1 lg:flex lg:flex-col gap-3 pr-1 custom-scrollbar"
        >
          @if (selectedHotel()?.id !== -1) {
            @for (item of filteredMenu(); track item.id) {
              <div
                class="bg-white dark:bg-[#1E293B] rounded-xl border border-slate-100 dark:border-white/5 p-2 lg:p-3 flex flex-col lg:flex-row gap-2 lg:gap-4 items-center lg:items-start group transition-all hover:border-[#FFC107]/30"
                [class.border-[#FFC107]]="getQuantity(item) > 0"
                [class.bg-[#FFF9E6]/20]="getQuantity(item) > 0"
              >
                <div
                  class="relative w-full lg:w-auto flex justify-center lg:block"
                >
                  <div
                    class="hidden lg:block w-16 h-16 rounded-lg overflow-hidden shrink-0"
                  >
                    <img
                      [src]="
                        item.image_url ||
                        'https://picsum.photos/seed/' + item.name + '/100/100'
                      "
                      [alt]="item.name"
                      class="w-full h-full object-cover"
                    />
                  </div>
                  @if (getQuantity(item) > 0) {
                    <div
                      class="absolute -top-2 -right-2 lg:-top-1 lg:-left-1 w-6 h-6 lg:w-5 lg:h-5 bg-[#FFC107] rounded-full flex items-center justify-center shadow-sm"
                    >
                      <mat-icon class="text-black text-sm lg:text-xs font-bold"
                        >check</mat-icon
                      >
                    </div>
                  }
                </div>
                <div class="flex-1 min-w-0 w-full flex flex-col">
                  <div
                    class="flex flex-col lg:flex-row justify-between items-start"
                  >
                    <h4
                      class="font-bold text-xs lg:text-sm text-[#1A1A1A] dark:text-white line-clamp-2 lg:truncate"
                    >
                      {{ item.name }}
                    </h4>
                    <span class="font-bold text-[#FFC107] text-sm mt-1 lg:mt-0"
                      >₹{{
                        ((item.hotelPrice ?? item.price) || 0).toLocaleString()
                      }}</span
                    >
                  </div>
                  <p
                    class="text-[10px] lg:text-[11px] text-slate-500 line-clamp-2 lg:line-clamp-1 mt-1 lg:mt-0.5"
                  >
                    {{ item.description }}
                  </p>

                  <div
                    class="flex items-center justify-between mt-auto pt-2 lg:pt-0 lg:mt-2"
                  >
                    <div
                      class="flex items-center bg-slate-100 dark:bg-[#0F172A] rounded-lg p-0.5 w-full lg:w-auto justify-between lg:justify-start"
                    >
                      <button
                        (click)="updateQuantity(item, -1)"
                        class="w-7 h-7 flex items-center justify-center hover:bg-white dark:hover:bg-[#1E293B] rounded-md transition-colors text-slate-500"
                      >
                        <mat-icon class="text-sm">remove</mat-icon>
                      </button>
                      <span
                        class="w-8 text-center text-xs font-bold text-[#1A1A1A] dark:text-white"
                        >{{ getQuantity(item) }}</span
                      >
                      <button
                        (click)="updateQuantity(item, 1)"
                        class="w-7 h-7 flex items-center justify-center bg-[#FFC107] text-black rounded-md shadow-sm transition-transform active:scale-90"
                      >
                        <mat-icon class="text-sm">add</mat-icon>
                      </button>
                    </div>
                    @if (getQuantity(item) > 0) {
                      <span
                        class="text-[10px] font-bold text-slate-400 hidden lg:inline"
                        >₹{{
                          (
                            getQuantity(item) *
                              (item.hotelPrice ?? item.price) || 0
                          ).toLocaleString()
                        }}</span
                      >
                    }
                  </div>
                </div>
              </div>
            } @empty {
              <div class="py-12 text-center col-span-2 lg:col-span-1">
                <mat-icon class="text-4xl text-slate-300 mb-2"
                  >restaurant_menu</mat-icon
                >
                <p class="text-slate-500">No items found for this category.</p>
              </div>
            }
          } @else {
            <div class="py-12 text-center col-span-2 lg:col-span-1">
              <mat-icon class="text-4xl text-slate-300 mb-2">info</mat-icon>
              <p class="text-slate-500">
                Menu selection is disabled for 'Manual Order'.
              </p>
            </div>
          }
        </div>

        <!-- Mobile Continue Button -->
        <div class="lg:hidden shrink-0 mt-2">
          <button
            type="button"
            (click)="currentStep.set(2)"
            class="w-full bg-[#FFC107] hover:bg-[#FFA000] text-black font-black py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 shadow-[#FFC107]/20"
          >
            <span>Continue to Details & Payment</span>
            <mat-icon>arrow_forward</mat-icon>
          </button>
        </div>
      </div>

      <!-- Right Panel: Order Summary -->
      <div
        [class.hidden]="currentStep() !== 2"
        class="lg:col-span-4 lg:flex flex flex-col gap-4 lg:h-full lg:overflow-hidden min-h-[500px]"
      >
        <div class="flex items-center gap-2 shrink-0">
          <div
            class="w-6 h-6 bg-[#FFC107] rounded flex items-center justify-center"
          >
            <mat-icon class="text-black text-sm">receipt_long</mat-icon>
          </div>
          <h2
            class="text-lg font-bold text-[#1A1A1A] dark:text-white uppercase tracking-tight"
          >
            Order Summary
          </h2>
        </div>

        <div
          class="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-white/5 flex-1 flex flex-col overflow-hidden shadow-sm"
        >
          <div class="p-5 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
            <!-- Order Details -->
            <div class="space-y-3">
              <p
                class="text-[10px] font-bold text-slate-400 uppercase tracking-widest"
              >
                Order Details
              </p>
              <div
                class="bg-slate-50 dark:bg-[#0F172A] p-3 rounded-lg border border-slate-100 dark:border-white/5"
              >
                <span class="text-[10px] font-bold text-slate-500 block"
                  >OrderID</span
                >
                <span
                  class="text-sm font-bold text-[#1A1A1A] dark:text-white"
                  >{{ orderId() }}</span
                >
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label
                    for="customerPhone"
                    class="text-[10px] font-bold text-slate-500 mb-1 block"
                    >Phone Number</label
                  >
                  <div class="relative">
                    <input
                      id="customerPhone"
                      type="text"
                      [(ngModel)]="customer.phone"
                      class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#FFC107] dark:text-white"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label
                  for="customerAddress"
                  class="text-[10px] font-bold text-slate-500 mb-1 block"
                  >Delivery Address</label
                >
                <textarea
                  id="customerAddress"
                  [(ngModel)]="customer.address"
                  rows="2"
                  class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#FFC107] resize-none dark:text-white"
                ></textarea>
              </div>
              <div>
                <label
                  for="deliveryDescription"
                  class="text-[10px] font-bold text-slate-500 mb-1 block"
                  >Description / Notes</label
                >
                <textarea
                  id="deliveryDescription"
                  [(ngModel)]="customer.description"
                  rows="4"
                  class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#FFC107] resize-none dark:text-white"
                ></textarea>
              </div>
              @if (selectedHotel()?.id === -1) {
                <div>
                  <label
                    for="manualPrice"
                    class="text-[10px] font-bold text-slate-500 mb-1 block"
                    >Manual Price</label
                  >
                  <input
                    id="manualPrice"
                    type="number"
                    [ngModel]="manualPrice()"
                    (ngModelChange)="onManualPriceChange($event)"
                    class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#FFC107] dark:text-white"
                  />
                </div>
              }
            </div>

            <!-- Logistics -->
            <div
              class="space-y-3 pt-4 border-t border-slate-100 dark:border-white/5"
            >
              <p
                class="text-[10px] font-bold text-slate-400 uppercase tracking-widest"
              >
                Logistics & Payment
              </p>
              <div>
                <span class="text-[10px] font-bold text-slate-500 mb-1 block"
                  >Assign Delivery Driver</span
                >
                <div
                  (click)="openDriverModal()"
                  (keydown.enter)="openDriverModal()"
                  tabindex="0"
                  class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg p-3 cursor-pointer hover:border-[#FFC107]/50 transition-colors flex items-center justify-between"
                >
                  <div class="flex items-center gap-3">
                    @if (selectedDriver()) {
                      <div
                        class="hidden lg:block w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0"
                      >
                        <img
                          [src]="
                            selectedDriver()?.image_url ||
                            'https://api.dicebear.com/7.x/avataaars/svg?seed=' +
                              selectedDriver()?.name
                          "
                          alt=""
                        />
                      </div>
                      <div class="flex flex-col">
                        <span
                          class="text-sm font-bold text-[#1A1A1A] dark:text-white"
                          >{{ selectedDriver()?.name }}</span
                        >
                        <span class="text-[10px] text-slate-500">{{
                          selectedDriver()?.mobile
                        }}</span>
                      </div>
                    } @else {
                      <div
                        class="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0"
                      >
                        <mat-icon class="text-slate-400 text-sm"
                          >pedal_bike</mat-icon
                        >
                      </div>
                      <span class="text-sm text-slate-500"
                        >Select a driver</span
                      >
                    }
                  </div>
                  <mat-icon class="text-slate-400 text-sm"
                    >chevron_right</mat-icon
                  >
                </div>
              </div>
              <div class="grid grid-cols-1 gap-3">
                <div>
                  <label
                    for="amountReceived"
                    class="text-[10px] font-bold text-slate-500 mb-1 block"
                    >Advance Amount</label
                  >
                  <div class="relative">
                    <span
                      class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold"
                      >₹</span
                    >
                    <input
                      id="amountReceived"
                      type="number"
                      [ngModel]="amountReceived()"
                      (ngModelChange)="onAmountReceivedChange($event)"
                      class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg pl-7 pr-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#FFC107] dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Pricing -->
            <div class="space-y-2 pt-4 border-t border-slate-100">
              <div class="flex justify-between text-xs font-medium">
                <span class="text-slate-500">Food Subtotal</span>
                <span class="text-[#1A1A1A] dark:text-white"
                  >₹{{ (subtotal() || 0).toLocaleString() }}</span
                >
              </div>
              <div
                class="flex justify-between items-center text-xs font-medium"
              >
                <span class="text-slate-500 flex items-center gap-1"
                  >Delivery Charges (DC)</span
                >
                <div class="relative w-24">
                  <span
                    class="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold"
                    >₹</span
                  >
                  <input
                    type="number"
                    [ngModel]="shippingFee()"
                    (ngModelChange)="onShippingFeeChange($event)"
                    class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg pl-6 pr-2 py-1 text-right text-sm outline-none focus:ring-1 focus:ring-[#FFC107] dark:text-white"
                  />
                </div>
              </div>

              <div class="flex justify-between text-xs font-medium">
                <span class="text-slate-500">GST ({{ gstPercent() }}%)</span>
                <span class="text-[#1A1A1A] dark:text-white"
                  >₹{{ (calculatedGst() || 0).toLocaleString() }}</span
                >
              </div>

              <div class="flex justify-between text-xs font-medium">
                <span class="text-slate-500">IGST ({{ igstPercent() }}%)</span>
                <span class="text-[#1A1A1A] dark:text-white"
                  >₹{{ (calculatedIgst() || 0).toLocaleString() }}</span
                >
              </div>

              <div
                class="flex justify-between items-center text-xs font-medium"
              >
                <span class="text-slate-500">Admin Commission</span>
                <div class="relative w-24">
                  <span
                    class="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold"
                    >₹</span
                  >
                  <input
                    type="number"
                    [ngModel]="adminCommission()"
                    (ngModelChange)="onAdminCommissionChange($event)"
                    class="w-full bg-[#F8F9FA] dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-lg pl-6 pr-2 py-1 text-right text-sm outline-none focus:ring-1 focus:ring-[#FFC107] dark:text-white"
                  />
                </div>
              </div>

              <div
                class="bg-[#FFF9E6] p-4 rounded-xl flex justify-between items-center mt-3 border border-[#FFC107]/10"
              >
                <span
                  class="text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]"
                  >Grand Total</span
                >
                <span class="text-xl font-display font-black text-[#FFC107]"
                  >₹{{ (grandTotal() || 0).toLocaleString() }}</span
                >
              </div>

              <div class="flex flex-col gap-1 pt-3">
                <div class="flex justify-between items-center">
                  <span class="text-[10px] font-bold text-slate-500"
                    >Advance Amount</span
                  >
                  <span class="text-xs font-bold text-[#1A1A1A] dark:text-white"
                    >₹{{ (amountReceived() || 0).toLocaleString() }}</span
                  >
                </div>
                <div
                  class="h-px bg-slate-100 border-dashed border-t w-full my-1"
                ></div>
                <div class="flex justify-between items-center">
                  <div class="flex flex-col">
                    <span
                      class="text-[10px] font-bold text-red-500 uppercase tracking-tighter"
                      >Balance Pending</span
                    >
                    <span class="text-[8px] text-slate-400"
                      >To be received</span
                    >
                  </div>
                  <span class="text-lg font-black text-red-500"
                    >₹{{ (balancePending() || 0).toLocaleString() }}</span
                  >
                </div>
              </div>
            </div>
          </div>

          <div
            class="p-5 bg-white dark:bg-[#1E293B] border-t border-slate-100 dark:border-white/5 shrink-0"
          >
            <!-- Mobile Back Button -->
            <button
              type="button"
              (click)="currentStep.set(1)"
              class="lg:hidden w-full mb-3 bg-slate-100 dark:bg-[#0F172A] hover:bg-slate-200 dark:hover:bg-[#1E293B] text-slate-700 dark:text-slate-300 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <mat-icon>arrow_back</mat-icon>
              <span>Back to Menu Selection</span>
            </button>

            @if (!canConfirm()) {
              <p
                class="text-[10px] text-red-500 text-center mb-3 font-bold uppercase tracking-wider"
              >
                Please fill all required fields to confirm
              </p>
            }
            <button
              (click)="confirmOrder()"
              [disabled]="!canConfirm()"
              class="w-full bg-[#FFC107] hover:bg-[#FFA000] disabled:bg-slate-200 dark:disabled:bg-white/5 disabled:text-slate-400 text-black font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-[#FFC107]/20"
            >
              <mat-icon>check_circle</mat-icon>
              CONFIRM & DISPATCH ORDER
            </button>
            <p
              class="text-[8px] text-center text-slate-400 uppercase tracking-widest mt-3 font-bold italic"
            >
              Order will be dispatched immediately to hotel
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Driver Selection Modal -->
    @if (showDriverModal()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      >
        <div
          class="bg-white dark:bg-[#1E293B] rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl border border-slate-100 dark:border-white/10 animate-in fade-in zoom-in duration-200"
        >
          <div
            class="p-6 border-b border-slate-100 dark:border-white/10 flex items-center justify-between"
          >
            <h2 class="text-xl font-bold text-slate-900 dark:text-white">
              Select Driver
            </h2>
            <button
              (click)="showDriverModal.set(false)"
              class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="p-4 border-b border-slate-100 dark:border-white/10">
            <div class="relative">
              <mat-icon
                class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"
                >search</mat-icon
              >
              <input
                type="text"
                [ngModel]="driverSearchTerm()"
                (ngModelChange)="driverSearchTerm.set($event)"
                placeholder="Search drivers..."
                class="w-full bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#FFC107]/20 transition-all dark:text-white"
              />
            </div>
          </div>

          <div class="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
            @for (driver of filteredDrivers(); track driver.id) {
              <div
                (click)="selectDriver(driver)"
                (keydown.enter)="selectDriver(driver)"
                tabindex="0"
                class="flex items-center gap-4 p-3 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 cursor-pointer hover:border-[#FFC107]/50 transition-all"
                [class.border-[#FFC107]]="
                  selectedDriverId() === driver.id.toString()
                "
                [class.bg-[#FFF9E6]/20]="
                  selectedDriverId() === driver.id.toString()
                "
              >
                <div
                  class="hidden lg:block w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0"
                >
                  <img
                    [src]="
                      driver.image_url ||
                      'https://api.dicebear.com/7.x/avataaars/svg?seed=' +
                        driver.name
                    "
                    alt=""
                  />
                </div>
                <div class="flex-1 min-w-0">
                  <h4 class="font-bold text-slate-900 dark:text-white truncate">
                    {{ driver.name }}
                  </h4>
                  <p class="text-xs text-slate-500 truncate">
                    {{ driver.mobile }}
                  </p>
                </div>
                <div class="shrink-0">
                  <span
                    [class]="
                      driver.status === 'active'
                        ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                        : driver.status === 'busy'
                          ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    "
                    class="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                  >
                    {{ driver.status }}
                  </span>
                </div>
              </div>
            } @empty {
              <div class="py-8 text-center">
                <mat-icon class="text-4xl text-slate-300 mb-2"
                  >person_off</mat-icon
                >
                <p class="text-slate-500">No drivers found.</p>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
  styleUrls: ["./create-order.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateOrder implements OnInit {
  search = inject(SearchService);
  toast = inject(ToastService);
  catalog = inject(CatalogService);
  api = inject(ApiService);
  orderService = inject(OrderService);
  settingsService = inject(SettingsService);
  invoiceService = inject(InvoiceService);
  router = inject(Router);

  currentStep = signal<number>(1);
  drivers = signal<DeliveryPerson[]>([]);
  selectedHotel = signal<Hotel | null>(null);
  selectedCategory = signal<string>("All Items");

  categoriesInfo = computed(() => {
    const hotel = this.selectedHotel();
    if (!hotel || hotel.id === -1) {
      return [
        {
          name: "All Items",
          count: 0,
          selectedCount: 0,
          selectedSum: 0,
        },
      ];
    }

    let bank = this.catalog.hotelMenus()[hotel.id] || [];
    bank = bank.filter((i) => i.isLinked);

    const uniqueRaw = [
      ...new Set(
        bank.map((i) => i.category || "Uncategorized").filter(Boolean),
      ),
    ];
    const cartItems = this.cart();

    const list = uniqueRaw.map((catName) => {
      const itemsInCat = bank.filter((i) => i.category === catName);
      const count = itemsInCat.length;

      const catCartItems = cartItems.filter(
        (entry) => entry.item.category === catName,
      );
      const selectedCount = catCartItems.reduce(
        (sum, entry) => sum + entry.quantity,
        0,
      );
      const selectedSum = catCartItems.reduce(
        (sum, entry) =>
          sum + (entry.item.hotelPrice ?? entry.item.price) * entry.quantity,
        0,
      );

      return {
        name: catName,
        count,
        selectedCount,
        selectedSum,
      };
    });

    const totalCount = bank.length;
    const totalSelectedCount = cartItems.reduce(
      (sum, entry) => sum + entry.quantity,
      0,
    );
    const totalSelectedSum = cartItems.reduce(
      (sum, entry) =>
        sum + (entry.item.hotelPrice ?? entry.item.price) * entry.quantity,
      0,
    );

    return [
      {
        name: "All Items",
        count: totalCount,
        selectedCount: totalSelectedCount,
        selectedSum: totalSelectedSum,
      },
      ...list,
    ];
  });

  activeCategory = computed(() => {
    const cats = this.categoriesInfo();
    const current = this.selectedCategory();
    if (cats.some((c) => c.name === current)) {
      return current;
    }
    return "All Items";
  });

  hotelFilter = signal<string>("");

  cart = signal<{ item: HotelMenuItem; quantity: number }[]>([]);
  customer = {
    name: "",
    phone: "",
    address: "",
    description: "",
  };
  orderId = signal<string>("");
  selectedDriverId = signal<string>("");
  showDriverModal = signal(false);
  driverSearchTerm = signal("");

  filteredDrivers = computed(() => {
    const term = this.driverSearchTerm().toLowerCase();
    return this.drivers().filter(
      (d) => d.name.toLowerCase().includes(term) || d.mobile.includes(term),
    );
  });

  selectedDriver = computed(() => {
    return (
      this.drivers().find((d) => d.id === Number(this.selectedDriverId())) ||
      null
    );
  });

  openDriverModal() {
    this.showDriverModal.set(true);
    this.driverSearchTerm.set("");
  }

  selectDriver(driver: DeliveryPerson) {
    this.selectedDriverId.set(String(driver.id));
    this.showDriverModal.set(false);
  }

  amountReceived = signal<number>(0);
  shippingFee = signal<number>(0);
  manualPrice = signal<number>(0);
  isShippingManuallyEdited = signal<boolean>(false);

  onAmountReceivedChange(value: number) {
    this.amountReceived.set(Math.round(value));
  }

  onManualPriceChange(value: number) {
    this.manualPrice.set(Math.round(value));
  }

  gstPercent = computed(() => this.settingsService.settings().taxes.gst);
  igstPercent = computed(() => this.settingsService.settings().taxes.igst);

  calculatedGst = computed(() =>
    Math.round(
      ((this.subtotal() + this.shippingFee()) * this.gstPercent()) / 100,
    ),
  );
  calculatedIgst = computed(() =>
    Math.round(
      ((this.subtotal() + this.shippingFee()) * this.igstPercent()) / 100,
    ),
  );

  adminCommission = signal<number>(0);
  isCommissionManuallyEdited = signal<boolean>(false);

  // Compute default commission based on settings and logic
  defaultAdminCommission = computed(() => {
    const settings = this.settingsService.settings().financial;
    const dc = this.shippingFee();
    const ranges = this.settingsService.commissionRanges();

    let amount = 0;
    // Find range first
    const range =
      ranges.length > 0
        ? ranges.find((r) => dc >= r.min_range && dc <= r.max_range)
        : null;

    if (range) {
      if (range.calculation_type === "percentage") {
        amount = (dc * range.commission_percentage) / 100;
      } else {
        amount = range.commission_percentage;
      }
    } else {
      // Fallback to global setting if no range matches
      if (settings.commissionType === "percentage") {
        amount = (dc * settings.adminCommission) / 100;
      } else {
        amount = settings.adminCommission;
      }
    }
    return Math.round(amount);
  });

  onAdminCommissionChange(value: number) {
    this.adminCommission.set(Math.round(value));
    this.isCommissionManuallyEdited.set(true);
  }

  onShippingFeeChange(value: number) {
    this.shippingFee.set(Math.round(value));
    this.isShippingManuallyEdited.set(true);
  }

  subtotal = computed(() => {
    if (this.selectedHotel()?.id === -1) return Math.round(this.manualPrice());
    return Math.round(
      this.cart().reduce(
        (acc, entry) =>
          acc + (entry.item.hotelPrice ?? entry.item.price) * entry.quantity,
        0,
      ),
    );
  });
  grandTotal = computed(() => {
    const sub = Number(this.subtotal() || 0);
    const ship = Number(this.shippingFee() || 0);
    const gst = Number(this.calculatedGst() || 0);
    const igst = Number(this.calculatedIgst() || 0);
    return Math.round(sub + ship + gst + igst);
  });
  balancePending = computed(() =>
    Math.max(
      0,
      Math.round(
        Number(this.grandTotal()) - Number(this.amountReceived() || 0),
      ),
    ),
  );

  filteredHotels = computed(() => {
    const filter = this.hotelFilter().toLowerCase();
    const globalSearch = this.search.searchTerm().toLowerCase();
    const othersHotel: Hotel = {
      id: -1,
      name: "Manual Order",
      address: "",
      category: "Manual Order",
      rating: 0,
      image_url: "",
      status: "active",
    };
    const hotels = [othersHotel, ...this.catalog.hotels()];
    return hotels.filter(
      (h) =>
        h.name.toLowerCase().includes(filter) &&
        h.name.toLowerCase().includes(globalSearch),
    );
  });

  menuSearchTerm = signal("");

  filteredMenu = computed(() => {
    const cat = this.activeCategory();
    const hotel = this.selectedHotel();
    const term = this.menuSearchTerm().toLowerCase();

    if (!hotel) return [];

    let hotelItems = this.catalog.hotelMenus()[hotel.id] || [];

    if (cat !== "All Items") {
      hotelItems = hotelItems.filter((i) => i.category === cat);
    }

    // Filter to only show linked menus
    hotelItems = hotelItems.filter((i) => i.isLinked);

    if (term) {
      hotelItems = hotelItems.filter(
        (i) =>
          i.name.toLowerCase().includes(term) ||
          (i.category && i.category.toLowerCase().includes(term)),
      );
    }

    return hotelItems;
  });

  route = inject(ActivatedRoute);

  constructor() {
    effect(
      () => {
        const sub = this.subtotal();
        const ranges = this.settingsService.shippingRanges();

        if (!this.isShippingManuallyEdited()) {
          let fee = 0;
          if (ranges && ranges.length > 0) {
            const range = ranges.find(
              (r) => sub >= r.min_amount && sub < r.max_amount,
            );
            if (range) {
              fee = range.price;
              if (range.calculation_type === "percentage") {
                fee = (sub * fee) / 100;
              }
            }
          }
          this.shippingFee.set(Math.round(fee));
        }
      },
      { allowSignalWrites: true },
    );

    effect(
      () => {
        if (!this.isCommissionManuallyEdited()) {
          this.adminCommission.set(this.defaultAdminCommission());
        }
      },
      { allowSignalWrites: true },
    );

    effect(
      () => {
        const hotels = this.catalog.hotels();
        const hotelId = this.route.snapshot.queryParams["hotelId"];

        if (hotels.length > 0 && !this.selectedHotel()) {
          if (hotelId) {
            const selected = hotels.find((h) => h.id === Number(hotelId));
            if (selected) {
              this.selectHotel(selected);
              return;
            }
          }
          this.selectHotel(hotels[0]);
        }
      },
      { allowSignalWrites: true },
    );
  }

  ngOnInit() {
    this.api.getDeliveryTeam().subscribe((d) => this.drivers.set(d));
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
    const entry = this.cart().find((e) => e.item.id === item.id);
    return entry?.quantity || 0;
  }

  updateQuantity(item: HotelMenuItem, delta: number) {
    this.cart.update((current) => {
      const existingIndex = current.findIndex((e) => e.item.id === item.id);
      if (existingIndex > -1) {
        const newQty = current[existingIndex].quantity + delta;
        if (newQty <= 0) {
          return current.filter((e) => e.item.id !== item.id);
        }
        const updated = [...current];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
        };
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
      HotelName: this.selectedHotel()?.name || "Unknown",
      MenuItems: this.cart()
        .map((c) => c.item.name)
        .join(", "),
      GrandTotal: this.grandTotal(),
      InvoiceUrl: "https://kallme.com/invoice/123",
    };
    this.api.sendWhatsApp(phone, "CUSTOMER_INVOICE", params).subscribe({
      next: () => this.toast.success("Invoice sent via WhatsApp"),
      error: () => this.toast.error("Failed to send invoice"),
    });
  }

  canConfirm(): boolean {
    const isOthers = this.selectedHotel()?.id === -1;
    if (isOthers) return true;

    return this.cart().length > 0 && !!this.selectedHotel();
  }

  confirmOrder() {
    if (!this.canConfirm()) return;

    const hotel = this.selectedHotel()!;
    const dc = this.shippingFee();
    const settings = this.settingsService.settings().financial;
    const ranges = this.settingsService.commissionRanges();

    let commissionPercentage = 0;
    const commissionAmount = this.adminCommission();

    const range =
      ranges.length > 0
        ? ranges.find((r) => dc >= r.min_range && dc <= r.max_range)
        : null;

    if (range) {
      if (range.calculation_type === "percentage") {
        commissionPercentage = range.commission_percentage;
      }
    } else if (settings.commissionType === "percentage") {
      commissionPercentage = settings.adminCommission;
    }

    const orderData: Partial<Order> = {
      order_number: this.orderId(),
      hotel_id: hotel.id,
      hotel_name: hotel.name,
      delivery_person_id: Number(this.selectedDriverId()) || null, // Optional driver
      customer_phone: this.customer.phone || "",
      delivery_address: this.customer.address || "",
      delivery_description: this.customer.description || "",
      subtotal: this.subtotal(),
      shipping_fee: dc,
      delivery_charge: dc,
      admin_commission_amount: commissionAmount,
      commission_percentage_applied: commissionPercentage,
      commission_calculation_type: settings.commissionType,
      shipping_calculation_type:
        this.settingsService.settings().logistics.shippingType,
      grand_total: this.grandTotal(),
      gst_amount: this.calculatedGst(),
      igst_amount: this.calculatedIgst(),
      amount_received: this.amountReceived(),
      balance_pending: this.balancePending(),
      status: "Order Placed",
      items: this.cart().map((c) => {
        const price = Math.round(c.item.hotelPrice ?? c.item.price);
        return {
          menu_id: c.item.id,
          menu_name: c.item.name,
          quantity: c.quantity,
          price: price,
          total: Math.round(c.quantity * price),
        };
      }),
    };

    console.log("Sending order data:", orderData);

    this.api.createOrder(orderData).subscribe({
      next: async (order) => {
        this.toast.success(
          `Order #${order.order_number} confirmed successfully!`,
        );

        // Auto-send invoice via WhatsApp
        // For manual orders, skip WhatsApp notifications for the customer
        if (order.customer_phone && order.hotel_name !== "Manual Order") {
          try {
            const doc = await this.invoiceService.createInvoicePdf(order);
            const pdfBase64 = doc.output("datauristring").split(",")[1];

            this.api
              .sendInvoicePdf(
                order.customer_phone,
                order.order_number || order.id?.toString() || "0",
                pdfBase64,
                order.id!,
                Number(order.grand_total) || 0,
                order.customer_name,
              )
              .subscribe({
                next: () => this.toast.success("Invoice sent via WhatsApp"),
                error: (err) =>
                  console.error("Failed to auto-send WhatsApp invoice:", err),
              });
          } catch (error) {
            console.error("Failed to generate PDF for auto-send:", error);
          }
        }

        this.cart.set([]);
        this.amountReceived.set(0);
        this.orderService.loadOrders();
        this.router.navigate(["/app/orders"]);
      },
      error: (err) => {
        console.error("Order creation failed:", err);
        this.toast.error(
          "Failed to place order: " + (err.error?.message || err.message),
        );
      },
    });
  }
}
