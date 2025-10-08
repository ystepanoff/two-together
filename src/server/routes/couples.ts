import express, { Response } from 'express';
import pool from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get couple's background image
router.get('/background', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // Get user's couple_id
    const coupleResult = await pool.query(
      'SELECT id, background_image FROM couples WHERE user1_id = $1 OR user2_id = $1',
      [req.userId]
    );

    if (coupleResult.rows.length === 0) {
      return res.json({ backgroundImage: null });
    }

    res.json({ backgroundImage: coupleResult.rows[0].background_image || null });
  } catch (error) {
    console.error('Get background error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update couple's background image
router.post('/background', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { backgroundImage } = req.body;

  if (!backgroundImage) {
    return res.status(400).json({ error: 'Background image is required' });
  }

  try {
    // Get user's couple_id
    const coupleResult = await pool.query(
      'SELECT id FROM couples WHERE user1_id = $1 OR user2_id = $1',
      [req.userId]
    );

    if (coupleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Couple not found. Please pair with your partner first.' });
    }

    const coupleId = coupleResult.rows[0].id;

    // Update background image
    await pool.query(
      'UPDATE couples SET background_image = $1 WHERE id = $2',
      [backgroundImage, coupleId]
    );

    res.json({ message: 'Background image updated successfully', backgroundImage });
  } catch (error) {
    console.error('Update background error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
