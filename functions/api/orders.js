const express = require('express');
const db = require('../db');
const authenticateToken = require('./authMiddleware');
const { sendWhatsAppMessage } = require('./whatsapp');
const router = express.Router();

// Get all orders
router.get('/', authenticateToken, async (req, res) => {
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
router.post('/', authenticateToken, async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    
    const { 
      order_number, hotel_id, hotel_name, delivery_person_id, customer_phone, 
      customer_type, delivery_description, subtotal, amount_received, 
      balance_pending, status, items 
    } = req.body;

    // Calculate shipping fee
    let shipping_fee = req.body.shipping_fee;
    if (shipping_fee === undefined || shipping_fee === null) {
      const shippingRange = await client.query(
        'SELECT price FROM shipping_ranges WHERE $1 >= min_amount AND $1 < max_amount',
        [subtotal]
      );
      shipping_fee = shippingRange.rows.length > 0 ? shippingRange.rows[0].price : 0;
    }
    
    // Calculate admin commission
    let admin_commission_amount = 0;
    let commission_percentage_applied = 0;
    const commissionConfig = await client.query(
      'SELECT commission_percentage FROM admin_commission_config WHERE $1 >= min_range AND $1 <= max_range',
      [shipping_fee]
    );
    if (commissionConfig.rows.length > 0) {
      commission_percentage_applied = commissionConfig.rows[0].commission_percentage;
      admin_commission_amount = (shipping_fee * commission_percentage_applied) / 100;
    }

    const grand_total = Number(subtotal) + Number(shipping_fee);

    const orderResult = await client.query(
      `INSERT INTO orders (
        order_number, hotel_id, hotel_name, delivery_person_id, customer_phone, 
        customer_type, delivery_description, subtotal, shipping_fee, delivery_charge, 
        admin_commission_amount, commission_percentage_applied, grand_total, amount_received, 
        balance_pending, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
      [
        order_number, hotel_id, hotel_name, delivery_person_id, customer_phone, 
        customer_type, delivery_description, subtotal, shipping_fee, shipping_fee, 
        admin_commission_amount, commission_percentage_applied, grand_total, amount_received, 
        balance_pending, status || 'Order Placed'
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

    // Create notifications
    const adminLink = `/app/orders/${order.id}`;
    const deliveryLink = `/app/delivery-orders?id=${order.id}`;
    
    // Notify admins
    await client.query(
      'INSERT INTO notifications (role, title, message, link) VALUES ($1, $2, $3, $4)',
      ['admin', 'New Order Created', `Order ${order.order_number} has been placed.`, adminLink]
    );
    
    // Notify delivery person if assigned
    if (delivery_person_id) {
      await client.query(
        'INSERT INTO notifications (role, user_id, title, message, link) VALUES ($1, $2, $3, $4, $5)',
        ['delivery', delivery_person_id, 'New Order Assigned', `You have been assigned order ${order.order_number}.`, deliveryLink]
      );
      
      // Send WhatsApp to delivery person
      const deliveryPerson = await client.query('SELECT name, mobile FROM delivery_persons WHERE id = $1', [delivery_person_id]);
      if (deliveryPerson.rows.length > 0) {
        const dp = deliveryPerson.rows[0];
        await sendWhatsAppMessage(dp.mobile, 'ORDER_ASSIGNED', {
          DeliveryPersonName: dp.name,
          OrderDate: new Date().toLocaleDateString(),
          Restaurant: hotel_name,
          MenuItems: items.map(i => i.menu_name).join(', '),
          DeliveryCharge: shipping_fee
        });
      }
    }

    // Send WhatsApp to customer
    await sendWhatsAppMessage(customer_phone, 'CUSTOMER_INVOICE', {
      OrderID: order.order_number,
      OrderDate: new Date().toLocaleDateString(),
      AmountPaid: grand_total
    });

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
router.get('/:id', authenticateToken, async (req, res) => {
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
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const result = await db.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    
    const order = result.rows[0];
    const adminLink = `/app/orders/${order.id}`;
    const deliveryLink = `/app/delivery-orders?id=${order.id}`;
    
    // Notify admins
    await db.query(
      'INSERT INTO notifications (role, title, message, link) VALUES ($1, $2, $3, $4)',
      ['admin', 'Order Status Updated', `Order ${order.order_number} status changed to ${status}.`, adminLink]
    );
    
    // Notify delivery person if assigned
    if (order.delivery_person_id) {
      await db.query(
        'INSERT INTO notifications (role, user_id, title, message, link) VALUES ($1, $2, $3, $4, $5)',
        ['delivery', order.delivery_person_id, 'Order Status Updated', `Order ${order.order_number} status changed to ${status}.`, deliveryLink]
      );
    }
    
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update order details
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');
    const values = Object.values(updates);
    values.push(id);

    const result = await db.query(
      `UPDATE orders SET ${setClause} WHERE id = $${values.length} RETURNING *`,
      values
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete order
router.delete('/:id', authenticateToken, async (req, res) => {
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
