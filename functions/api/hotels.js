const express = require('express');
const db = require('../db');
const router = express.Router();

// Get all hotels
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM hotels 
      ORDER BY 
        CASE WHEN order_sequence IS NOT NULL AND order_sequence > 0 THEN 0 ELSE 1 END,
        order_sequence ASC,
        LOWER(name) ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Batch update hotel order sequence (must be before /:id)
router.put('/reorder', async (req, res) => {
  try {
    const { sequences } = req.body;
    if (!Array.isArray(sequences)) {
      return res.status(400).json({ error: 'Expected sequences array' });
    }
    for (const item of sequences) {
      if (item && item.id !== undefined) {
        await db.query(
          'UPDATE hotels SET order_sequence = $1 WHERE id = $2',
          [item.order_sequence !== undefined ? item.order_sequence : null, item.id]
        );
      }
    }
    const result = await db.query(`
      SELECT * FROM hotels 
      ORDER BY 
        CASE WHEN order_sequence IS NOT NULL AND order_sequence > 0 THEN 0 ELSE 1 END,
        order_sequence ASC,
        LOWER(name) ASC
    `);
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
    const { name, address, category, rating, image_url, status, order_sequence } = req.body;
    const result = await db.query(
      'INSERT INTO hotels (name, address, category, rating, image_url, status, order_sequence) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, address, category, rating, image_url, status || 'active', order_sequence !== undefined ? order_sequence : null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update hotel
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, category, rating, image_url, status, order_sequence } = req.body;
    const result = await db.query(
      'UPDATE hotels SET name = $1, address = $2, category = $3, rating = $4, image_url = $5, status = $6, order_sequence = $7 WHERE id = $8 RETURNING *',
      [name, address, category, rating, image_url, status, order_sequence !== undefined ? order_sequence : null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Hotel not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete hotel
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM hotels WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Hotel not found' });
    res.json({ message: 'Hotel deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
