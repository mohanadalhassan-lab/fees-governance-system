import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import { auditLog } from '../middleware/auth.js';

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const result = await query(
      `SELECT u.user_id, u.username, u.email, u.full_name, u.password_hash, u.status,
              r.role_id, r.role_code, r.role_name
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.username = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.user_id, username: user.username, role: user.role_code },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Audit log
    await query(
      `INSERT INTO audit_events (event_type, entity_type, entity_id, user_id, action, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['USER_LOGIN', 'USER', user.user_id, user.user_id, 'LOGIN', req.ip, req.get('user-agent')]
    );

    res.json({
      token,
      user: {
        userId: user.user_id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: {
          roleId: user.role_id,
          roleCode: user.role_code,
          roleName: user.role_name
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await query(
      `SELECT u.user_id, u.username, u.email, u.full_name, u.status,
              r.role_id, r.role_code, r.role_name
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.user_id = $1`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      userId: user.user_id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      status: user.status,
      role: {
        roleId: user.role_id,
        roleCode: user.role_code,
        roleName: user.role_name
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
