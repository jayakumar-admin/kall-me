const express = require('express');
const db = require('../db');
const router = express.Router();

// Get all menus
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM menus ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get menus by hotel ID
router.get('/hotel/:hotelId', async (req, res) => {
  try {
    const { hotelId } = req.params;
    const result = await db.query('SELECT * FROM menus WHERE hotel_id = $1 ORDER BY id ASC', [hotelId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
