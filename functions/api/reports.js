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
        COUNT(o.id) AS total_orders,
        SUM(o.grand_total) AS total_amount,
        SUM(o.subtotal) AS item_total,
        SUM(o.delivery_charge) AS delivery_total,
        SUM(CASE WHEN o.delivery_charge <= 30 THEN 1 ELSE 0 END) AS below_30_count,
        SUM(o.admin_commission_amount) AS total_commission,
        SUM(o.balance_pending) AS balance_pending
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
