const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/daily', async (req, res) => {
  try {
    // In a real app, this would be an aggregation query
    const result = await db.query(`
      SELECT 
        DATE(created_at) as date, 
        COUNT(*) as total_orders, 
        SUM(grand_total) as total_revenue
      FROM orders
      WHERE LOWER(COALESCE(status, '')) != 'cancelled'
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) DESC
      LIMIT 7
    `);
    
    if (result.rows.length === 0) {
      // Return mock data if DB is empty for demo purposes
      return res.json([
        { date: '2024-03-01', total_orders: 45, total_revenue: 12000 },
      ]);
    }
    
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/delivery-person', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = `
      SELECT 
        d.name,
        COUNT(CASE WHEN LOWER(COALESCE(o.status, '')) != 'cancelled' THEN o.id END) AS total_orders,
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(o.status, '')) != 'cancelled' THEN o.grand_total ELSE 0 END), 0) AS total_amount,
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(o.status, '')) != 'cancelled' THEN o.subtotal ELSE 0 END), 0) AS item_total,
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(o.status, '')) != 'cancelled' THEN o.delivery_charge ELSE 0 END), 0) AS delivery_total,
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(o.status, '')) != 'cancelled' AND o.delivery_charge <= 30 THEN 1 ELSE 0 END), 0) AS below_30_count,
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(o.status, '')) != 'cancelled' THEN o.admin_commission_amount ELSE 0 END), 0) AS total_commission,
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(o.status, '')) != 'cancelled' THEN o.amount_received ELSE 0 END), 0) AS advance_amount,
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(o.status, '')) != 'cancelled' THEN o.balance_pending ELSE 0 END), 0) AS balance_pending
      FROM orders o
      JOIN delivery_persons d ON o.delivery_person_id = d.id
    `;
    if (startDate && endDate) {
      query += ` WHERE DATE(o.created_at) >= '${startDate}' AND DATE(o.created_at) <= '${endDate}'`;
    }
    query += ` GROUP BY d.name;`;
    
    const result = await db.query(query);
    
    // Add calculated fields
    const formattedData = result.rows.map(row => {
      const bonus = parseInt(row.below_30_count) * 10;
      const commission = parseFloat(row.total_commission || 0);
      const deliveryTotal = parseFloat(row.delivery_total || 0);
      return {
        ...row,
        bonus: bonus,
        final_earnings: deliveryTotal - commission + bonus
      };
    });

    res.json(formattedData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
