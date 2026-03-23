const express = require('express');
const db = require('../db');
const router = express.Router();

// Get all menus (with optional hotel_id filtering)
router.get('/', async (req, res) => {
  try {
    const { hotel_id } = req.query;
    let result;
    if (hotel_id) {
      result = await db.query(`
        SELECT m.*, mm.price as price
        FROM menus m
        INNER JOIN merchant_menus mm ON m.id = mm.menu_id
        WHERE mm.hotel_id = $1
        ORDER BY m.id ASC
      `, [hotel_id]);
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
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { hotel_id, name, description, price, category, image_url } = req.body;
    const result = await client.query(
      'INSERT INTO menus (hotel_id, name, description, price, category, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [hotel_id, name, description, price, category, image_url]
    );
    const newItem = result.rows[0];
    
    if (hotel_id) {
      await client.query(
        'INSERT INTO merchant_menus (hotel_id, menu_id, price) VALUES ($1, $2, $3)',
        [hotel_id, newItem.id, price]
      );
    }
    
    await client.query('COMMIT');
    res.status(201).json(newItem);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Update menu item
router.put('/:id', async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { hotel_id, name, description, price, category, image_url } = req.body;
    const result = await client.query(
      'UPDATE menus SET hotel_id = $1, name = $2, description = $3, price = $4, category = $5, image_url = $6 WHERE id = $7 RETURNING *',
      [hotel_id, name, description, price, category, image_url, id]
    );
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
    if (hotel_id) {
      await client.query(
        'UPDATE merchant_menus SET price = $1 WHERE hotel_id = $2 AND menu_id = $3',
        [price, hotel_id, id]
      );
    }
    
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
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
