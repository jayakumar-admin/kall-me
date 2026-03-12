const express = require('express');
const db = require('../db');
const router = express.Router();

// Get all delivery persons
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM delivery_persons ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const result = await db.query(
      'UPDATE delivery_persons SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Delivery person not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create delivery person
router.post('/', async (req, res) => {
  try {
    const { name, mobile, status } = req.body;
    const result = await db.query(
      'INSERT INTO delivery_persons (name, mobile, status) VALUES ($1, $2, $3) RETURNING *',
      [name, mobile, status || 'active']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update delivery person
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, mobile, status } = req.body;
    const result = await db.query(
      'UPDATE delivery_persons SET name = $1, mobile = $2, status = $3 WHERE id = $4 RETURNING *',
      [name, mobile, status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Delivery person not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete delivery person
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM delivery_persons WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Delivery person not found' });
    res.json({ message: 'Delivery person deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
