const express = require('express');
const db = require('../db');
const authenticateToken = require('./authMiddleware');
const router = express.Router();

// Get notifications for the logged in user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { role, id } = req.user;
    let query = '';
    let params = [];
    
    if (role === 'admin') {
      // Admins see notifications meant for all admins or specifically for them
      query = 'SELECT * FROM notifications WHERE role = $1 AND (user_id IS NULL OR user_id = $2) ORDER BY created_at DESC LIMIT 50';
      params = ['admin', id];
    } else if (role === 'delivery') {
      // Delivery persons see notifications meant specifically for them
      query = 'SELECT * FROM notifications WHERE role = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 50';
      params = ['delivery', id];
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark a notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;
    
    // Ensure the user owns the notification or it's an admin notification
    let query = '';
    let params = [];
    
    if (role === 'admin') {
      query = 'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND role = $2 AND (user_id IS NULL OR user_id = $3) RETURNING *';
      params = [id, 'admin', userId];
    } else if (role === 'delivery') {
      query = 'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND role = $2 AND user_id = $3 RETURNING *';
      params = [id, 'delivery', userId];
    }
    
    const result = await db.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found or unauthorized' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark all notifications as read
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    const { role, id: userId } = req.user;
    
    let query = '';
    let params = [];
    
    if (role === 'admin') {
      query = 'UPDATE notifications SET is_read = TRUE WHERE role = $1 AND (user_id IS NULL OR user_id = $2) RETURNING *';
      params = ['admin', userId];
    } else if (role === 'delivery') {
      query = 'UPDATE notifications SET is_read = TRUE WHERE role = $1 AND user_id = $2 RETURNING *';
      params = ['delivery', userId];
    }
    
    const result = await db.query(query, params);
    res.json({ success: true, count: result.rowCount });
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
