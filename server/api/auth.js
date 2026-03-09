const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'kallme_secret_key';

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Mock login for demo - in real app would check DB
  if (email === 'admin@kallme.com' && password === 'password123') {
    const token = jwt.sign({ email, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
    return res.json({
      success: true,
      token,
      user: { name: 'Alex Morgan', email: 'admin@kallme.com', role: 'admin' }
    });
  }

  return res.status(401).json({ success: false, message: 'Invalid credentials' });
});

module.exports = router;
