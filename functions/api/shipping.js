const express = require('express');
const db = require('../db');
const router = express.Router();

// Get all shipping ranges
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM shipping_ranges ORDER BY min_amount ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update/Create shipping ranges
router.post('/', async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM shipping_ranges');
    for (const range of req.body) {
      await client.query(
        'INSERT INTO shipping_ranges (min_amount, max_amount, price) VALUES ($1, $2, $3)',
        [range.min_amount, range.max_amount, range.price]
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
