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
        SUM(amount) as total_revenue
      FROM orders
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) DESC
      LIMIT 7
    `);
    
    if (result.rows.length === 0) {
      // Return mock data if DB is empty for demo purposes
      return res.json([
        { date: '2024-03-01', total_orders: 45, total_revenue: 12000 },
        { date: '2024-03-02', total_orders: 52, total_revenue: 15000 },
        { date: '2024-03-03', total_orders: 38, total_revenue: 11000 },
        { date: '2024-03-04', total_orders: 60, total_revenue: 18000 },
        { date: '2024-03-05', total_orders: 55, total_revenue: 16500 },
        { date: '2024-03-06', total_orders: 70, total_revenue: 21000 },
        { date: '2024-03-07', total_orders: 86, total_revenue: 25000 }
      ]);
    }
    
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
