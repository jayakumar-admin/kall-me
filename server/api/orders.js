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

module.exports = router;
