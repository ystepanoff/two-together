import express, { Response } from 'express';
import pool from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminAuth';

const router = express.Router();

// Public endpoint for checking registration settings
router.get('/settings/public', async (req, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT setting_value FROM app_settings WHERE setting_key = 'allow_registration'"
    );

    const allowRegistration = result.rows[0]?.setting_value === 'true';

    res.json({ allow_registration: allowRegistration });
  } catch (error) {
    console.error('Get public settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/settings', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT setting_value FROM app_settings WHERE setting_key = 'allow_registration'"
    );

    const allowRegistration = result.rows[0]?.setting_value === 'true';

    res.json({ allow_registration: allowRegistration });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/settings/allow_registration', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { value } = req.body;

  if (typeof value !== 'boolean') {
    return res.status(400).json({ error: 'Value must be a boolean' });
  }

  try {
    await pool.query(
      "UPDATE app_settings SET setting_value = $1, updated_at = NOW() WHERE setting_key = 'allow_registration'",
      [value.toString()]
    );

    res.json({ message: 'Setting updated successfully', allow_registration: value });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/check', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ is_admin: result.rows[0].is_admin || false });
  } catch (error) {
    console.error('Check admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
