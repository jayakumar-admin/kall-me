import { Component, inject, signal, computed, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { SettingsService } from '../../services/settings.service';
import { Order } from '../../models';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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

  printInvoice() {
    window.print();
  }

  async downloadPdf() {
    const order = this.selectedOrder();
    if (!order) return;

    this.toast.success('Generating PDF...');

    try {
      const doc = await this.createInvoicePdf(order);
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
      const doc = await this.createInvoicePdf(order);
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

  private async createInvoicePdf(order: Order): Promise<jsPDF> {
    const doc = new jsPDF();
    
    // Add header
    doc.setFontSize(22);
    doc.setTextColor(26, 26, 26); // #1A1A1A
    doc.text('INVOICE', 14, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Bill ID: ${this.generateBillId(order)}`, 14, 35);
    doc.text(`Order ID: ${order.order_number || order.id}`, 14, 40);
    doc.text(`Date: ${new Date(order.created_at || Date.now()).toLocaleString()}`, 14, 45);
    
    // Hotel Info (Right Aligned)
    doc.setTextColor(26, 26, 26);
    doc.setFontSize(14);
    doc.text('KALL ME Delivery', 196, 25, { align: 'right' });
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('123 Delivery Street', 196, 32, { align: 'right' });
    doc.text('Food City, FC 12345', 196, 37, { align: 'right' });
    doc.text('GSTIN: TAX-KALL-99201', 196, 42, { align: 'right' });
    
    // Divider
    doc.setDrawColor(241, 245, 249); // slate-100
    doc.line(14, 55, 196, 55);
    
    // Billed To & Restaurant
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.text('BILLED TO:', 14, 65);
    doc.text('RESTAURANT:', 120, 65);
    
    doc.setTextColor(26, 26, 26);
    doc.setFontSize(11);
    doc.text(order.customer_phone, 14, 72);
    doc.text((order.hotel_id === -1 || order.hotel_id === null) ? 'Manual Order' : (order.hotel_name || 'Restaurant'), 120, 72);
    
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(10);
    doc.text(order.delivery_address || 'No Address', 14, 78);
    doc.setFontSize(9);
    doc.text(`Notes: ${order.delivery_description || 'N/A'}`, 14, 84);
    
    // Items Table
    const tableData = (order.items || []).map(item => [
      item.menu_name || 'Menu Item',
      item.quantity.toString(),
      `INR ${item.price.toLocaleString()}`,
      `INR ${(item.total || (item.price * item.quantity)).toLocaleString()}`
    ]);
    
    autoTable(doc, {
      startY: 100,
      head: [['Item', 'Qty', 'Price', 'Total']],
      body: tableData,
      theme: 'striped',
      headStyles: { 
        fillColor: [255, 193, 7], // #FFC107
        textColor: [0, 0, 0],
        fontStyle: 'bold'
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { left: 14, right: 14 }
    });
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalY = (doc as any).lastAutoTable.finalY || 150;
    
    // Totals
    const totalsX = 140;
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    
    doc.text(`Subtotal (${this.totalProducts()} items):`, totalsX, finalY + 15);
    doc.text(`INR ${this.subtotal().toLocaleString()}`, 196, finalY + 15, { align: 'right' });
    
    doc.text(`Delivery Charges (DC):`, totalsX, finalY + 22);
    doc.text(`INR ${(order.delivery_charge || 0).toLocaleString()}`, 196, finalY + 22, { align: 'right' });
    
    doc.text(`GST (${this.gstPercent()}%):`, totalsX, finalY + 29);
    doc.text(`INR ${this.calculatedGst().toLocaleString()}`, 196, finalY + 29, { align: 'right' });
    
    doc.text(`IGST (${this.igstPercent()}%):`, totalsX, finalY + 36);
    doc.text(`INR ${this.calculatedIgst().toLocaleString()}`, 196, finalY + 36, { align: 'right' });
    
    // Grand Total
    doc.setDrawColor(241, 245, 249);
    doc.line(totalsX, finalY + 42, 196, finalY + 42);
    
    doc.setFontSize(14);
    doc.setTextColor(255, 193, 7); // #FFC107
    doc.text(`Grand Total:`, totalsX, finalY + 52);
    doc.text(`INR ${this.grandTotal().toLocaleString()}`, 196, finalY + 52, { align: 'right' });
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('Thank you for choosing KALL ME Delivery!', 105, 285, { align: 'center' });
    
    return doc;
  }
}
