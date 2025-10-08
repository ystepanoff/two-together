import express, { Response } from 'express';
import pool from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

async function getCoupleId(userId: number): Promise<number | null> {
  const result = await pool.query(
    'SELECT id FROM couples WHERE user1_id = $1 OR user2_id = $1',
    [userId]
  );
  return result.rows.length > 0 ? result.rows[0].id : null;
}

router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const coupleId = await getCoupleId(req.userId!);

    if (!coupleId) {
      return res.json({ items: [], total: 0, page: 1, pageSize: 10 });
    }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const offset = (page - 1) * pageSize;

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM should_do_again WHERE couple_id = $1',
      [coupleId]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      'SELECT * FROM should_do_again WHERE couple_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [coupleId, pageSize, offset]
    );

    res.json({
      items: result.rows,
      total,
      page,
      pageSize
    });
  } catch (error) {
    console.error('Get should do again error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const coupleId = await getCoupleId(req.userId!);

    if (!coupleId) {
      return res.status(400).json({ error: 'User must be part of a couple' });
    }

    const result = await pool.query(
      'DELETE FROM should_do_again WHERE id = $1 AND couple_id = $2 RETURNING *',
      [id, coupleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete should do again error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
