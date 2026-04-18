import { Component, inject, signal, computed, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { SettingsService } from '../../services/settings.service';
import { InvoiceService } from '../../services/invoice.service';
import { Order } from '../../models';

@Component({
  selector: 'app-invoice-generation',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './invoice-generation.html'
})
export class InvoiceGeneration implements OnInit {
  api = inject(ApiService);
  toast = inject(ToastService);
  route = inject(ActivatedRoute);
  settingsService = inject(SettingsService);
  invoiceService = inject(InvoiceService);

  searchOrderId = '';
  isLoading = signal(false);
  hasSearched = signal(false);
  selectedOrder = signal<Order | null>(null);
  today = new Date();

  @ViewChild('invoicePreview') invoicePreview!: ElementRef;

  gstPercent = computed(() => this.settingsService.settings().taxes.gst);
  igstPercent = computed(() => this.settingsService.settings().taxes.igst);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['orderId']) {
        this.searchOrderId = params['orderId'];
        this.searchOrder();
      }
    });
  }

  subtotal = computed(() => {
    const order = this.selectedOrder();
    if (!order) return 0;
    if (order.items && order.items.length > 0) {
      return order.items.reduce((sum, item) => sum + (Number(item.total) || (Number(item.price) * Number(item.quantity))), 0);
    }
    return Number(order.subtotal) || 0;
  });

  totalProducts = computed(() => {
    const order = this.selectedOrder();
    if (!order || !order.items) return 0;
    return order.items.reduce((sum, item) => sum + item.quantity, 0);
  });

  calculatedGst = computed(() => {
    return (this.subtotal() * this.gstPercent()) / 100;
  });

  calculatedIgst = computed(() => {
    return (this.subtotal() * this.igstPercent()) / 100;
  });

  grandTotal = computed(() => {
    const order = this.selectedOrder();
    if (!order) return 0;
    const shippingFee = Number(order.shipping_fee) || 0;
    const sub = Number(this.subtotal());
    const gst = (sub * this.gstPercent()) / 100;
    const igst = (sub * this.igstPercent()) / 100;
    return sub + shippingFee + gst + igst;
  });

  searchOrder() {
    if (!this.searchOrderId.trim()) {
      this.toast.error('Please enter an Order ID');
      return;
    }

    this.isLoading.set(true);
    this.hasSearched.set(true);
    this.selectedOrder.set(null);

    this.api.getOrder(this.searchOrderId.trim()).subscribe({
      next: (order) => {
        console.log('Order found:', order);
        this.selectedOrder.set(order);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to fetch order:', err);
        // Fallback to searching in list if getOrder fails (maybe it's not implemented on external API)
        this.api.getOrders().subscribe({
          next: (orders) => {
            const order = orders.find(o => 
              o.order_number === this.searchOrderId.trim() || 
              o.id?.toString() === this.searchOrderId.trim()
            );
            
            if (order) {
              this.selectedOrder.set(order);
            } else {
              this.toast.error('Order not found');
            }
            this.isLoading.set(false);
          },
          error: () => {
            this.toast.error('Failed to fetch orders');
            this.isLoading.set(false);
          }
        });
      }
    });
  }

  generateBillId(order: Order): string {
    return `BILL-${order.id || Math.floor(Math.random() * 10000)}-${new Date().getFullYear()}`;
  }

  toNumber(value: unknown): number {
    return Number(value) || 0;
  }

  async printInvoice() {
    const order = this.selectedOrder();
    if (!order) return;

    this.toast.success('Preparing for print...');

    try {
      const doc = await this.invoiceService.createInvoicePdf(order);
      // Auto-print JS
      doc.autoPrint();
      // Open in new window/tab and trigger print
      const blobUrl = doc.output('bloburl');
      window.open(blobUrl, '_blank');
      this.toast.success('Print dialog opened');
    } catch (error) {
      console.error('Print Error:', error);
      this.toast.error('Failed to prepare invoice for printing');
    }
  }

  async downloadPdf() {
    const order = this.selectedOrder();
    if (!order) return;

    this.toast.success('Generating PDF...');

    try {
      const doc = await this.invoiceService.createInvoicePdf(order);
      doc.save(`invoice_${order.order_number || order.id}.pdf`);
      this.toast.success('Invoice downloaded successfully');
    } catch (error) {
      console.error('PDF Generation Error:', error);
      this.toast.error('Failed to generate PDF. Please try again.');
    }
  }

  async sendViaWhatsApp() {
    const order = this.selectedOrder();
    if (!order) return;

    if (!order.customer_phone) {
      this.toast.error('Customer phone number is missing');
      return;
    }

    this.isLoading.set(true);
    try {
      const doc = await this.invoiceService.createInvoicePdf(order);
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      
      this.api.sendInvoicePdf(
        order.customer_phone, 
        order.order_number || order.id?.toString() || '0', 
        pdfBase64,
        order.id!,
        this.grandTotal(),
        order.customer_name
      ).subscribe({
        next: () => {
          this.toast.success('Invoice sent via WhatsApp');
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Failed to send WhatsApp:', err);
          this.toast.error('Failed to send invoice via WhatsApp');
          this.isLoading.set(false);
        }
      });
    } catch (error) {
      console.error('WhatsApp Send Error:', error);
      this.toast.error('Failed to prepare invoice for WhatsApp');
      this.isLoading.set(false);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file.type !== 'application/pdf') {
        this.toast.error('Please select a PDF file');
        return;
      }

      const order = this.selectedOrder();
      if (!order) return;

      if (!order.customer_phone) {
        this.toast.error('Customer phone number is missing');
        return;
      }

      this.isLoading.set(true);
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        
        this.api.sendInvoicePdf(
          order.customer_phone!, 
          order.order_number || order.id?.toString() || '0', 
          base64String,
          order.id!,
          this.grandTotal(),
          order.customer_name
        ).subscribe({
          next: () => {
            this.toast.success('Attached PDF sent via WhatsApp');
            this.isLoading.set(false);
            input.value = ''; // Reset input
          },
          error: (err) => {
            console.error('Failed to send WhatsApp:', err);
            this.toast.error('Failed to send attached PDF via WhatsApp');
            this.isLoading.set(false);
            input.value = ''; // Reset input
          }
        });
      };
      reader.onerror = () => {
        this.toast.error('Failed to read file');
        this.isLoading.set(false);
      };
      reader.readAsDataURL(file);
    }
  }
}
