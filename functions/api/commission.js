const express = require('express');
const db = require('../db');
const authenticateToken = require('./authMiddleware');
const router = express.Router();

// Get commission ranges
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM admin_commission_config ORDER BY min_range ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update commission ranges
router.post('/', authenticateToken, async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM admin_commission_config');
    
    const ranges = req.body;
    for (const range of ranges) {
      await client.query(
        'INSERT INTO admin_commission_config (min_range, max_range, commission_percentage, calculation_type) VALUES ($1, $2, $3, $4)',
        [range.min_range, range.max_range, range.commission_percentage, range.calculation_type || 'percentage']
      );
    }
    
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
