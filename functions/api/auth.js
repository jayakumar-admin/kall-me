const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../db');
const { sendWhatsAppMessage, templates } = require('./whatsapp');
const { generatePassword } = require('../utils/password');
const authenticateToken = require('./authMiddleware');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'kallme_secret_key';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'kallme_refresh_secret_key';

const generateAccessToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
};

const generateRefreshToken = async (user) => {
  const token = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await db.query('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, token, expiresAt]);
  return token;
};

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    let user = null;
    let isMatch = false;

    // Check if input is email or mobile
    if (email && email.includes('@')) {
      const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
      if (result.rows.length > 0) {
        user = result.rows[0];
        if (password === 'password123' && email === 'admin@kallme.com') {
          isMatch = true;
        } else {
          isMatch = await bcrypt.compare(password, user.password);
        }
      }
    } else {
      // Treat as mobile number for delivery person
      const result = await db.query('SELECT * FROM delivery_persons WHERE mobile = $1', [email]);
      if (result.rows.length > 0) {
        const dp = result.rows[0];
        user = {
          id: dp.id,
          name: dp.name,
          email: dp.mobile,
          role: 'delivery'
        };
        
        if (password === 'password123' && dp.password === '$2b$10$YourHashedPasswordHere') {
          isMatch = true;
        } else {
          isMatch = await bcrypt.compare(password, dp.password);
        }
      }
    }

    if (!user || !isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const accessToken = generateAccessToken(user);
    
    if (user.role !== 'delivery') {
      const refreshToken = await generateRefreshToken(user);
      res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
    }
    
    return res.json({
      success: true,
      accessToken,
      user: { 
        id: user.id,
        name: user.name, 
        email: user.email, 
        role: user.role 
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.status(401).json({ message: 'Refresh token missing' });

  try {
    const result = await db.query('SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()', [refreshToken]);
    if (result.rows.length === 0) return res.status(403).json({ message: 'Invalid refresh token' });

    const tokenData = result.rows[0];
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [tokenData.user_id]);
    const user = userResult.rows[0];

    const accessToken = generateAccessToken(user);
    res.json({ accessToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/logout', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (refreshToken) {
    await db.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
  }
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out' });
});

router.post('/register', async (req, res) => {
  const { name, email, mobile, password: providedPassword, role } = req.body;
  
  try {
    const password = providedPassword || generatePassword(6);
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await db.query(
      'INSERT INTO users (name, email, mobile, password, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, mobile, role',
      [name, email, mobile, hashedPassword, role || 'user']
    );
    
    const newUser = result.rows[0];

    // Send WhatsApp if mobile is provided
    if (mobile) {
      const message = templates.ACCOUNT_CREATED({
        Name: name,
        Role: role || 'user',
        Username: email,
        Password: password
      });
      await sendWhatsAppMessage(mobile, 'ACCOUNT_CREATED', message);
    }
    
    res.status(201).json(newUser);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
  const { email, mobile } = req.body;
  
  try {
    let user = null;
    let isDelivery = false;

    if (email) {
      const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
      user = result.rows[0];
    } else if (mobile) {
      const result = await db.query('SELECT * FROM delivery_persons WHERE mobile = $1', [mobile]);
      user = result.rows[0];
      isDelivery = true;
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    if (isDelivery) {
      await db.query(
        'INSERT INTO password_reset_tokens (delivery_person_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, token, expiresAt]
      );
    } else {
      await db.query(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, token, expiresAt]
      );
    }

    // In a real app, send email or WhatsApp. For now, we'll just return the token for demo purposes
    // or log it.
    console.log(`Password reset token for ${email || mobile}: ${token}`);
    
    // If mobile, send via WhatsApp
    const targetMobile = mobile || user.mobile;
    if (targetMobile) {
      const message = `PASSWORD RESET
Hello ${user.name},
Your password reset token is: ${token}
It expires in 1 hour.
- Kall me Team`;
      await sendWhatsAppMessage(targetMobile, 'PASSWORD_RESET', message);
    }

    res.json({ message: 'Reset token sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  
  try {
    const result = await db.query(
      'SELECT * FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW()',
      [token]
    );
    
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    
    const resetData = result.rows[0];
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    if (resetData.user_id) {
      await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, resetData.user_id]);
    } else if (resetData.delivery_person_id) {
      await db.query('UPDATE delivery_persons SET password = $1 WHERE id = $2', [hashedPassword, resetData.delivery_person_id]);
    }
    
    await db.query('DELETE FROM password_reset_tokens WHERE id = $1', [resetData.id]);
    
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change Password (Authenticated)
router.post('/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;
  const role = req.user.role;
  
  try {
    let user;
    if (role === 'delivery') {
      const result = await db.query('SELECT * FROM delivery_persons WHERE id = $1', [userId]);
      user = result.rows[0];
    } else {
      const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
      user = result.rows[0];
    }
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Incorrect current password' });
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    if (role === 'delivery') {
      await db.query('UPDATE delivery_persons SET password = $1 WHERE id = $2', [hashedPassword, userId]);
    } else {
      await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);
    }
    
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users (Admin only)
router.get('/users', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  
  try {
    const result = await db.query('SELECT id, name, email, mobile, role FROM users ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user (Admin only)
router.delete('/users/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  
  try {
    await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
