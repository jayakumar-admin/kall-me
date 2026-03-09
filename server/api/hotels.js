const express = require('express');
const db = require('../db');
const router = express.Router();

// Get all hotels
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM hotels ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get hotel by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM hotels WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Hotel not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create hotel
router.post('/', async (req, res) => {
  try {
    const { name, address, category, rating, commission_rate, image_url, status } = req.body;
    const result = await db.query(
      'INSERT INTO hotels (name, address, category, rating, commission_rate, image_url, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, address, category, rating, commission_rate, image_url, status || 'active']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
