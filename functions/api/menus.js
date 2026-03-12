const express = require('express');
const db = require('../db');
const router = express.Router();

// Get all menus (with optional hotelId filtering)
router.get('/', async (req, res) => {
  try {
    const { hotelId } = req.query;
    let result;
    if (hotelId) {
      result = await db.query('SELECT * FROM menus WHERE hotel_id = $1 ORDER BY id ASC', [hotelId]);
    } else {
      result = await db.query('SELECT * FROM menus ORDER BY id ASC');
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get menu by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM menus WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Menu item not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create menu item
router.post('/', async (req, res) => {
  try {
    const { hotel_id, name, description, price, category, image_url } = req.body;
    const result = await db.query(
      'INSERT INTO menus (hotel_id, name, description, price, category, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [hotel_id, name, description, price, category, image_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update menu item
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { hotel_id, name, description, price, category, image_url } = req.body;
    const result = await db.query(
      'UPDATE menus SET hotel_id = $1, name = $2, description = $3, price = $4, category = $5, image_url = $6 WHERE id = $7 RETURNING *',
      [hotel_id, name, description, price, category, image_url, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Menu item not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete menu item
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM menus WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Menu item not found' });
    res.json({ message: 'Menu item deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
