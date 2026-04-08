const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generates an invoice PDF and returns the file path.
 */
async function generateInvoicePdf(order, items) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const filename = `invoice_${order.order_number || order.id}_${Date.now()}.pdf`;
      const publicDir = path.join(__dirname, '../../public/invoices');
      
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }

      const filePath = path.join(publicDir, filename);
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // Header
      doc.fontSize(20).text('INVOICE', { align: 'left' });
      doc.fontSize(10).text(`Order ID: ${order.order_number || order.id}`, { align: 'left' });
      doc.text(`Date: ${new Date(order.created_at || Date.now()).toLocaleString()}`, { align: 'left' });
      doc.moveDown();

      // Company Info
      doc.fontSize(12).text('KALL ME Delivery', { align: 'right' });
      doc.fontSize(10).text('123 Delivery Street', { align: 'right' });
      doc.text('Food City, FC 12345', { align: 'right' });
      doc.text('GSTIN: TAX-KALL-99201', { align: 'right' });
      doc.moveDown();

      doc.lineCap('butt').moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();

      // Customer & Hotel Info
      const top = doc.y;
      doc.fontSize(10).text('BILLED TO:', 50, top);
      doc.fontSize(11).text(order.customer_phone || 'N/A', 50, top + 15);
      doc.fontSize(10).text(order.delivery_address || 'No Address', 50, top + 30);

      doc.fontSize(10).text('RESTAURANT:', 350, top);
      doc.fontSize(11).text(order.hotel_name || 'Manual Order', 350, top + 15);
      doc.moveDown(4);

      // Items Table Header
      const tableTop = doc.y;
      doc.fontSize(10).text('Item', 50, tableTop, { bold: true });
      doc.text('Qty', 300, tableTop, { align: 'right', bold: true });
      doc.text('Price', 400, tableTop, { align: 'right', bold: true });
      doc.text('Total', 500, tableTop, { align: 'right', bold: true });
      
      doc.moveDown();
      doc.lineCap('butt').moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();

      // Items
      let currentY = doc.y;
      (items || []).forEach(item => {
        doc.fontSize(10).text(item.menu_name || 'Item', 50, currentY);
        doc.text(item.quantity.toString(), 300, currentY, { align: 'right' });
        doc.text(`₹${Number(item.price).toLocaleString()}`, 400, currentY, { align: 'right' });
        doc.text(`₹${Number(item.total || (item.price * item.quantity)).toLocaleString()}`, 500, currentY, { align: 'right' });
        currentY += 20;
      });

      doc.moveDown();
      doc.lineCap('butt').moveTo(350, currentY).lineTo(550, currentY).stroke();
      currentY += 10;

      // Totals
      doc.fontSize(10).text('Subtotal:', 350, currentY);
      doc.text(`₹${Number(order.subtotal || 0).toLocaleString()}`, 500, currentY, { align: 'right' });
      currentY += 15;

      doc.text('Delivery Fee:', 350, currentY);
      doc.text(`₹${Number(order.shipping_fee || 0).toLocaleString()}`, 500, currentY, { align: 'right' });
      currentY += 15;

      doc.fontSize(12).fillColor('#FFC107').text('Grand Total:', 350, currentY, { bold: true });
      doc.text(`₹${Number(order.grand_total || 0).toLocaleString()}`, 500, currentY, { align: 'right', bold: true });

      // Footer
      doc.fontSize(8).fillColor('#94A3B8').text('Thank you for choosing KALL ME Delivery!', 50, 750, { align: 'center' });

      doc.end();

      stream.on('finish', () => {
        resolve({ filename, filePath });
      });

      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = { generateInvoicePdf };
