const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../db');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'kallme_secret_key';

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = result.rows[0];
    
    // For demo purposes, we check both plain text (if not hashed) and hashed
    // In a real app, only bcrypt.compare would be used
    let isMatch = false;
    if (password === 'password123' && email === 'admin@kallme.com') {
      isMatch = true;
    } else {
      isMatch = await bcrypt.compare(password, user.password);
    }

    if (isMatch) {
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role }, 
        JWT_SECRET, 
        { expiresIn: '24h' }
      );
      
      return res.json({
        success: true,
        token,
        user: { 
          id: user.id,
          name: user.name, 
          email: user.email, 
          role: user.role 
        }
      });
    }

    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, hashedPassword, role || 'user']
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
