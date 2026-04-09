import { Injectable, inject } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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
    doc.text('Amalapuram, Andhra Pradesh', 196, 37, { align: 'right' });
    doc.text('GSTIN: --', 196, 42, { align: 'right' });
    
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
    doc.text(order.customer_phone || 'N/A', 14, 72);
    doc.text((order.hotel_id === -1 || order.hotel_id === null) ? 'Manual Order' : (order.hotel_name || 'Restaurant'), 120, 72);
    
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(10);
    doc.text(order.delivery_address || 'No Address', 14, 78);
    doc.setFontSize(9);
    doc.text(`Notes: ${order.delivery_description || 'N/A'}`, 14, 84);
    
    // Table Data
    const tableBody = (order.items || []).map(item => [
      item.menu_name || 'Menu Item',
      item.quantity.toString(),
      `Rs. ${Number(item.price).toFixed(2)}`,
      `Rs. ${Number(item.total).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 95,
      head: [['Item', 'Qty', 'Price', 'Total']],
      body: tableBody,
      theme: 'plain',
      headStyles: {
        textColor: [100, 116, 139],
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'left'
      },
      bodyStyles: {
        textColor: [26, 26, 26],
        fontSize: 10,
        halign: 'left'
      },
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'right' },
        3: { halign: 'right', fontStyle: 'bold' }
      },
      didDrawCell: (data) => {
        // Add bottom border to rows
        if (data.row.section === 'body') {
          doc.setDrawColor(241, 245, 249);
          doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
        }
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalY = (doc as any).lastAutoTable.finalY || 150;
    
    // Totals
    const subtotal = (order.items || []).reduce((sum, item) => sum + Number(item.total), 0);
    const shippingFee = Number(order.shipping_fee) || 0;
    
    const gstPercent = this.settingsService.settings().taxes.gst;
    const igstPercent = this.settingsService.settings().taxes.igst;
    
    const gst = (subtotal * gstPercent) / 100;
    const igst = (subtotal * igstPercent) / 100;
    const grandTotal = subtotal + shippingFee + gst + igst;

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    
    let currentY = finalY + 15;
    doc.text('Subtotal:', 140, currentY);
    doc.text(`Rs. ${subtotal.toFixed(2)}`, 196, currentY, { align: 'right' });
    
    currentY += 8;
    doc.text('Delivery Fee:', 140, currentY);
    doc.text(`Rs. ${shippingFee.toFixed(2)}`, 196, currentY, { align: 'right' });
    
    currentY += 8;
    doc.text(`GST (${gstPercent}%):`, 140, currentY);
    doc.text(`Rs. ${gst.toFixed(2)}`, 196, currentY, { align: 'right' });
    
    currentY += 8;
    doc.text(`IGST (${igstPercent}%):`, 140, currentY);
    doc.text(`Rs. ${igst.toFixed(2)}`, 196, currentY, { align: 'right' });
    
    currentY += 12;
    doc.setDrawColor(241, 245, 249);
    doc.line(140, currentY - 6, 196, currentY - 6);
    
    doc.setFontSize(12);
    doc.setTextColor(26, 26, 26);
    doc.setFont('helvetica', 'bold');
    doc.text('Grand Total:', 140, currentY);
    doc.setTextColor(239, 68, 68); // red-500
    doc.text(`Rs. ${grandTotal.toFixed(2)}`, 196, currentY, { align: 'right' });
    
    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('Thank you for your business!', 105, 280, { align: 'center' });

    return doc;
  }
}
