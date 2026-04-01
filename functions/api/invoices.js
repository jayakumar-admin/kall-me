const express = require('express');
const PDFDocument = require('pdfkit');
const db = require('../db');
const router = express.Router();

router.get('/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await db.query(`
      SELECT o.*, h.name as hotel_name, h.address as hotel_address
      FROM orders o 
      LEFT JOIN hotels h ON o.hotel_id = h.id 
      WHERE o.id = $1
    `, [orderId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = result.rows[0];

    const doc = new PDFDocument();
    let filename = `invoice-${order.order_number}.pdf`;
    filename = encodeURIComponent(filename);

    res.setHeader('Content-disposition', 'attachment; filename="' + filename + '"');
    res.setHeader('Content-type', 'application/pdf');

    doc.fontSize(25).text('INVOICE', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Order Number: ${order.order_number}`);
    doc.text(`Date: ${new Date(order.created_at).toLocaleDateString()}`);
    doc.moveDown();
    doc.text(`Customer Phone: ${order.customer_phone}`);
    doc.moveDown();
    doc.text(`Hotel: ${order.hotel_name}`);
    doc.text(`Address: ${order.hotel_address}`);
    doc.moveDown();
    doc.text('--------------------------------------------------');
    doc.fontSize(16).text(`Total Amount: $${order.amount}`, { align: 'right' });
    doc.fontSize(12).text('--------------------------------------------------');
    doc.moveDown();
    doc.text('Thank you for your business!', { align: 'center' });

    doc.pipe(res);
    doc.end();

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
