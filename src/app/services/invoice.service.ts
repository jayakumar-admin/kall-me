import { Injectable, inject } from '@angular/core';
import { jsPDF } from 'jspdf';
import { Order } from '../models';
import { SettingsService } from './settings.service';

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  settingsService = inject(SettingsService);

  generateBillId(order: Order): string {
    const date = new Date(order.created_at || Date.now());
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `INV-${year}${month}-${order.id?.toString().padStart(4, '0') || '0000'}`;
  }

  async createInvoicePdf(order: Order): Promise<jsPDF> {
    const doc = new jsPDF({
      unit: 'mm',
      format: [80, 150], // Thermal printer width
    });
    
    // Center alignment helper
    const centerX = 40;

    // Header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('E-BILL', centerX, 10, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text('Kall Me', centerX, 16, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Biller Name: admin', centerX, 21, { align: 'center' });
    
    doc.line(5, 25, 75, 25);
    
    // Table Header
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Name', 5, 30);
    doc.text('Qty.', 35, 30, { align: 'right' });
    doc.text('Rate', 55, 30, { align: 'right' });
    doc.text('Price', 75, 30, { align: 'right' });
    
    doc.line(5, 32, 75, 32);
    
    // Items
    doc.setFont('helvetica', 'normal');
    let y = 37;
    let totalQty = 0;
    (order.items || []).forEach(item => {
      // Handle item name wrapping if too long
      const itemName = item.menu_name || 'Item';
      const splitName = doc.splitTextToSize(itemName, 28);
      doc.text(splitName, 5, y);
      
      doc.text(item.quantity.toString(), 35, y, { align: 'right' });
      doc.text(Number(item.price).toFixed(0), 55, y, { align: 'right' });
      doc.text(Number(item.total).toFixed(0), 75, y, { align: 'right' });
      
      y += (splitName.length * 4);
      totalQty += item.quantity;
    });
    
    doc.line(5, y, 75, y);
    y += 5;
    
    // Totals
    doc.text('Total Quantity:', 5, y);
    doc.text(totalQty.toString(), 75, y, { align: 'right' });
    y += 5;
    
    const subtotal = (order.items || []).reduce((sum, item) => sum + Number(item.total), 0);
    doc.text('Sub Total:', 5, y);
    doc.text(`Rs. ${Math.round(subtotal)}`, 75, y, { align: 'right' });
    y += 5;

    if (Number(order.shipping_fee) > 0) {
      doc.text('Delivery Fee:', 5, y);
      doc.text(`Rs. ${Math.round(Number(order.shipping_fee))}`, 75, y, { align: 'right' });
      y += 5;
    }

    if (Number(order.gst_amount) > 0) {
      doc.text('GST:', 5, y);
      doc.text(`Rs. ${Math.round(Number(order.gst_amount))}`, 75, y, { align: 'right' });
      y += 5;
    }

    if (Number(order.igst_amount) > 0) {
      doc.text('IGST:', 5, y);
      doc.text(`Rs. ${Math.round(Number(order.igst_amount))}`, 75, y, { align: 'right' });
      y += 5;
    }
    
    doc.line(5, y, 75, y);
    y += 5;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Total Payable Amount:', 5, y);
    doc.text(`Rs. ${Math.round(Number(order.grand_total))}`, 75, y, { align: 'right' });
    
    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Thank you for Choosing Us, Please Visit again', centerX, y + 10, { align: 'center' });

    return doc;
  }
}
