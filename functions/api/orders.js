const express = require('express');
const db = require('../db');
const router = express.Router();

// Get all orders
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT o.*, h.name as hotel_name 
      FROM orders o 
      LEFT JOIN hotels h ON o.hotel_id = h.id 
      ORDER BY o.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create order
router.post('/', async (req, res) => {
  try {
    const { order_number, hotel_id, customer_name, amount, status } = req.body;
    const result = await db.query(
      'INSERT INTO orders (order_number, hotel_id, customer_name, amount, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [order_number, hotel_id, customer_name, amount, status || 'placed']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get order by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(`
      SELECT o.*, h.name as hotel_name 
      FROM orders o 
      LEFT JOIN hotels h ON o.hotel_id = h.id 
      WHERE o.id = $1
    `, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update order status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const result = await db.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete order
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM orders WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Order deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
