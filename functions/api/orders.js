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
    
    const orders = result.rows;
    
    // Fetch items for each order
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

// Create order
router.post('/', async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    
    const { 
      order_number, hotel_id, hotel_name, delivery_person_id, customer_name, customer_phone, 
      customer_type, delivery_address, subtotal, shipping_fee, grand_total, amount_received, 
      balance_pending, status, items 
    } = req.body;

    const orderResult = await client.query(
      `INSERT INTO orders (
        order_number, hotel_id, hotel_name, delivery_person_id, customer_name, customer_phone, 
        customer_type, delivery_address, subtotal, shipping_fee, grand_total, amount_received, 
        balance_pending, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [
        order_number, hotel_id, hotel_name, delivery_person_id, customer_name, customer_phone, 
        customer_type, delivery_address, subtotal, shipping_fee, grand_total, amount_received, 
        balance_pending, status || 'placed'
      ]
    );

    const order = orderResult.rows[0];
    order.items = [];

    if (items && items.length > 0) {
      for (const item of items) {
        const itemResult = await client.query(
          'INSERT INTO order_items (order_id, menu_id, menu_name, quantity, price, total) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
          [order.id, item.menu_id, item.menu_name, item.quantity, item.price, item.total]
        );
        order.items.push(itemResult.rows[0]);
      }
    }

    await client.query('COMMIT');
    res.status(201).json(order);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
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
      WHERE o.id = $1 OR o.order_number = $1
    `, [id]);
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    
    const order = result.rows[0];
    const itemsResult = await db.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
    order.items = itemsResult.rows;
    
    res.json(order);
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
