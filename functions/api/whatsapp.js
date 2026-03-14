const express = require('express');
const db = require('../db');
const router = express.Router();

// Mock WhatsApp API - In production, replace with actual WhatsApp API integration (e.g., Twilio)
const sendWhatsAppMessage = async (to, templateName, message) => {
  console.log(`Sending WhatsApp message to ${to} using template ${templateName}`);
  console.log('Message Content:', message);
  
  // Log to database
  try {
    await db.query(
      'INSERT INTO whatsapp_logs (recipient, template_name, message, status) VALUES ($1, $2, $3, $4)',
      [to, templateName, message, 'sent']
    );
  } catch (err) {
    console.error('Failed to log WhatsApp message:', err);
  }
  
  return { success: true };
};

const templates = {
  ORDER_ASSIGNED: (params) => `ORDER ASSIGNED (DELIVERY PERSON)
Hello ${params.DeliveryPersonName},
New delivery assigned.
Order Date: ${params.OrderDate}
Hotel: ${params.HotelName}
Items: ${params.MenuItems}
Delivery Charge: ₹${params.DeliveryCharge}
Please confirm pickup.
- Kall me Team`,
  ORDER_CANCELLED: (params) => `ORDER CANCELLED
Hello ${params.DeliveryPersonName},
The following order has been cancelled:
Hotel: ${params.HotelName}
Order Date: ${params.OrderDate}
- Kall me Team`,
  CUSTOMER_INVOICE: (params) => `ORDER CONFIRMED
Hello ${params.CustomerName},
Your order has been confirmed.
Order Details:
Order Number: ${params.OrderNumber}
Hotel: ${params.HotelName}
Items: ${params.MenuItems}
Total: ₹${params.GrandTotal}
Invoice: ${params.InvoiceUrl}
- Kall me Team`
};

// Get WhatsApp logs
router.get('/logs', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM whatsapp_logs ORDER BY created_at DESC LIMIT 100');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/send', async (req, res) => {
  const { to, templateName, parameters } = req.body;
  if (!templates[templateName]) {
    return res.status(400).json({ error: 'Invalid template' });
  }
  
  const message = templates[templateName](parameters);
  
  try {
    await sendWhatsAppMessage(to, templateName, message);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router;
