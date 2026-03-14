const express = require('express');
const db = require('../db');
const router = express.Router();

// Update merchant menu pricing
router.post('/update', async (req, res) => {
  const { hotel_id, items } = req.body;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    
    // Delete existing merchant menu items for this hotel
    await client.query('DELETE FROM merchant_menus WHERE hotel_id = $1', [hotel_id]);
    
    // Insert new pricing
    for (const item of items) {
      await client.query(
        'INSERT INTO merchant_menus (hotel_id, menu_id, price) VALUES ($1, $2, $3)',
        [hotel_id, item.menu_id, item.price]
      );
    }
    
    await client.query('COMMIT');
    res.status(200).json({ message: 'Pricing updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
