const express = require('express');
const db = require('../db');
const router = express.Router();

// Bulk import hotels
router.post('/hotels', async (req, res) => {
  const { hotels } = req.body;
  if (!Array.isArray(hotels)) {
    return res.status(400).json({ error: 'Invalid input. Expected an array of hotels.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const inserted = [];
    for (const h of hotels) {
      const name = h.hotel_name || h.name;
      if (!name) continue;

      const result = await client.query(
        `INSERT INTO hotels (name, address, phone, category, rating, commission_rate, image_url, status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          name.trim(), 
          h.address ? h.address.trim() : null, 
          h.phone ? h.phone.trim() : null, 
          h.category ? h.category.trim() : 'Indian', 
          parseFloat(h.rating) || 4.0, 
          parseInt(h.commission_rate) || 15, 
          h.image_url ? h.image_url.trim() : 'https://picsum.photos/seed/restaurant/800/600', 
          h.status ? h.status.trim().toLowerCase() : 'active'
        ]
      );
      inserted.push(result.rows[0]);
    }
    await client.query('COMMIT');
    res.json({ success: true, count: inserted.length, data: inserted });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to import hotels', message: err.message });
  } finally {
    client.release();
  }
});

// Bulk import menus
router.post('/menus', async (req, res) => {
  const { menus } = req.body;
  if (!Array.isArray(menus)) {
    return res.status(400).json({ error: 'Invalid input. Expected an array of menus.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const inserted = [];
    const skipped = [];
    
    // Fetch all hotels for matching name case-insensitively
    const hotelsRes = await client.query('SELECT id, name FROM hotels');
    const hotelsList = hotelsRes.rows;

    for (const m of menus) {
      const hotelName = m.hotel_name;
      const menuName = m.menu_name;
      if (!hotelName || !menuName) {
        skipped.push({ menu: m, reason: 'Missing hotel_name or menu_name' });
        continue;
      }

      // Find hotel by matching name case-insensitive
      const hotel = hotelsList.find(h => h.name.trim().toLowerCase() === hotelName.trim().toLowerCase());
      if (!hotel) {
        skipped.push({ menu: m, reason: `Hotel "${hotelName}" not found` });
        continue;
      }

      const price = parseFloat(m.price) || 0.0;
      const result = await client.query(
        `INSERT INTO menus (hotel_id, name, description, price, category, image_url) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          hotel.id,
          menuName.trim(),
          m.description ? m.description.trim() : null,
          price,
          m.category ? m.category.trim() : 'Main Course',
          m.image_url ? m.image_url.trim() : 'https://picsum.photos/seed/food/200/200'
        ]
      );
      const insertedMenu = result.rows[0];

      // Insert into merchant_menus
      await client.query(
        'INSERT INTO merchant_menus (hotel_id, menu_id, price) VALUES ($1, $2, $3) ON CONFLICT (hotel_id, menu_id) DO UPDATE SET price = EXCLUDED.price',
        [hotel.id, insertedMenu.id, price]
      );

      inserted.push(insertedMenu);
    }

    await client.query('COMMIT');
    res.json({ 
      success: true, 
      count: inserted.length, 
      data: inserted, 
      skipped: skipped 
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to import menus', message: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
