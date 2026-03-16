const express = require('express');
const db = require('../db');
const bcrypt = require('bcryptjs');
const authenticateToken = require('./authMiddleware');
const { generatePassword } = require('../utils/password');
const { sendWhatsAppMessage, templates } = require('./whatsapp');
const router = express.Router();

// --- Delivery Portal Routes (Requires Auth) ---

// Get assigned orders for logged-in delivery person
router.get('/orders', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'delivery') return res.status(403).json({ error: 'Forbidden' });
    
    const result = await db.query(`
      SELECT o.*, h.name as hotel_name, h.address as hotel_address
      FROM orders o 
      LEFT JOIN hotels h ON o.hotel_id = h.id 
      WHERE o.delivery_person_id = $1
      ORDER BY o.created_at DESC
    `, [req.user.id]);
    
    const orders = result.rows;
    for (let order of orders) {
      const itemsResult = await db.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
      order.items = itemsResult.rows;
    }
    
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific order details for logged-in delivery person
router.get('/orders/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'delivery') return res.status(403).json({ error: 'Forbidden' });
    
    const { id } = req.params;
    const result = await db.query(`
      SELECT o.*, h.name as hotel_name, h.address as hotel_address
      FROM orders o 
      LEFT JOIN hotels h ON o.hotel_id = h.id 
      WHERE (o.id = $1 OR o.order_number = $1) AND o.delivery_person_id = $2
    `, [id, req.user.id]);
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found or not assigned to you' });
    
    const order = result.rows[0];
    const itemsResult = await db.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
    order.items = itemsResult.rows;
    
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update order status by delivery person
router.put('/order-status', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'delivery') return res.status(403).json({ error: 'Forbidden' });
    
    const { orderId, status } = req.body;
    const result = await db.query(
      'UPDATE orders SET status = $1 WHERE id = $2 AND delivery_person_id = $3 RETURNING *',
      [status, orderId, req.user.id]
    );
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found or not assigned to you' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get delivery person profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'delivery') return res.status(403).json({ error: 'Forbidden' });
    
    const result = await db.query('SELECT id, name, mobile, status FROM delivery_persons WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Profile not found' });
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update delivery person profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'delivery') return res.status(403).json({ error: 'Forbidden' });
    
    const { name, status, password } = req.body;
    
    let result;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      result = await db.query(
        'UPDATE delivery_persons SET name = $1, status = $2, password = $3 WHERE id = $4 RETURNING id, name, mobile, status',
        [name, status, hashedPassword, req.user.id]
      );
    } else {
      result = await db.query(
        'UPDATE delivery_persons SET name = $1, status = $2 WHERE id = $3 RETURNING id, name, mobile, status',
        [name, status, req.user.id]
      );
    }
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'Profile not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Admin Routes ---

// Get all delivery persons
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT id, name, mobile, status FROM delivery_persons ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const result = await db.query(
      'UPDATE delivery_persons SET status = $1 WHERE id = $2 RETURNING id, name, mobile, status',
      [status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Delivery person not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create delivery person
router.post('/', async (req, res) => {
  try {
    const { name, mobile, status, password: providedPassword } = req.body;
    
    const password = providedPassword || generatePassword(6);
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await db.query(
      'INSERT INTO delivery_persons (name, mobile, status, password) VALUES ($1, $2, $3, $4) RETURNING id, name, mobile, status',
      [name, mobile, status || 'active', hashedPassword]
    );
    
    const newDP = result.rows[0];

    // Send WhatsApp
    if (mobile) {
      const message = templates.ACCOUNT_CREATED({
        Name: name,
        Role: 'delivery',
        Username: mobile,
        Password: password
      });
      await sendWhatsAppMessage(mobile, 'ACCOUNT_CREATED', message);
    }
    
    res.status(201).json(newDP);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update delivery person
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, mobile, status, password } = req.body;
    
    let result;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      result = await db.query(
        'UPDATE delivery_persons SET name = $1, mobile = $2, status = $3, password = $4 WHERE id = $5 RETURNING id, name, mobile, status',
        [name, mobile, status, hashedPassword, id]
      );
    } else {
      result = await db.query(
        'UPDATE delivery_persons SET name = $1, mobile = $2, status = $3 WHERE id = $4 RETURNING id, name, mobile, status',
        [name, mobile, status, id]
      );
    }
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'Delivery person not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete delivery person
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM delivery_persons WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Delivery person not found' });
    res.json({ message: 'Delivery person deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
