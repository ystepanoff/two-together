import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Register
router.post('/register', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const userExists = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const result = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
      [username, passwordHash]
    );

    const token = jwt.sign({ userId: result.rows[0].id }, process.env.JWT_SECRET as string, {
      expiresIn: '7d',
    });

    res.status(201).json({
      token,
      user: { id: result.rows[0].id, username: result.rows[0].username },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string, {
      expiresIn: '7d',
    });

    res.json({
      token,
      user: { id: user.id, username: user.username },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Pair with partner
router.post('/pair', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { partnerUsername } = req.body;

  if (!partnerUsername) {
    return res.status(400).json({ error: 'Partner username is required' });
  }

  try {
    // Find partner by username
    const partnerResult = await pool.query('SELECT * FROM users WHERE username = $1', [partnerUsername]);

    if (partnerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    const partnerId = partnerResult.rows[0].id;

    if (partnerId === req.userId) {
      return res.status(400).json({ error: 'Cannot pair with yourself' });
    }

    // Check if user is already in a couple
    const existingCoupleResult = await pool.query(
      'SELECT * FROM couples WHERE user1_id = $1 OR user2_id = $1',
      [req.userId]
    );

    if (existingCoupleResult.rows.length > 0) {
      return res.status(400).json({ error: 'User is already paired' });
    }

    // Check if partner is already in a couple
    const partnerCoupleResult = await pool.query(
      'SELECT * FROM couples WHERE user1_id = $1 OR user2_id = $1',
      [partnerId]
    );

    if (partnerCoupleResult.rows.length > 0) {
      return res.status(400).json({ error: 'Partner is already paired with someone else' });
    }

    // Create couple
    const coupleResult = await pool.query(
      'INSERT INTO couples (user1_id, user2_id) VALUES ($1, $2) RETURNING *',
      [req.userId, partnerId]
    );

    // Update users with partner_id
    await pool.query('UPDATE users SET partner_id = $1 WHERE id = $2', [partnerId, req.userId]);
    await pool.query('UPDATE users SET partner_id = $1 WHERE id = $2', [req.userId, partnerId]);

    res.json({ message: 'Successfully paired!', couple: coupleResult.rows[0] });
  } catch (error) {
    console.error('Pair error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get partner status
router.get('/partner', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userResult = await pool.query('SELECT partner_id FROM users WHERE id = $1', [req.userId]);

    if (userResult.rows.length === 0 || !userResult.rows[0].partner_id) {
      return res.json({ hasPair: false });
    }

    const partnerResult = await pool.query('SELECT id, username FROM users WHERE id = $1', [userResult.rows[0].partner_id]);

    res.json({
      hasPair: true,
      partner: {
        id: partnerResult.rows[0].id,
        username: partnerResult.rows[0].username
      }
    });
  } catch (error) {
    console.error('Get partner error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password
router.post('/change-password', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  try {
    // Get current user
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPasswordHash, req.userId]);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
