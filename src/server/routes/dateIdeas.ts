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
      return res.json([]);
    }

    const result = await pool.query(
      `SELECT di.*,
              (SELECT COUNT(*) FROM date_idea_votes WHERE date_idea_id = di.id) as vote_count,
              (SELECT COUNT(*) > 0 FROM date_idea_votes WHERE date_idea_id = di.id AND user_id = $2) as current_user_voted
       FROM date_ideas di
       WHERE di.couple_id = $1
       ORDER BY di.created_at DESC`,
      [coupleId, req.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get date ideas error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { title, description } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const coupleId = await getCoupleId(req.userId!);

    if (!coupleId) {
      return res.status(400).json({ error: 'User must be part of a couple' });
    }

    const result = await pool.query(
      'INSERT INTO date_ideas (couple_id, created_by_user_id, title, description) VALUES ($1, $2, $3, $4) RETURNING *',
      [coupleId, req.userId, title, description || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create date idea error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { title, description, is_completed, is_favorite } = req.body;

  try {
    const coupleId = await getCoupleId(req.userId!);

    if (!coupleId) {
      return res.status(400).json({ error: 'User must be part of a couple' });
    }

    const result = await pool.query(
      `UPDATE date_ideas
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           is_completed = COALESCE($3, is_completed),
           is_favorite = COALESCE($4, is_favorite),
           completed_at = CASE WHEN $3 = true THEN CURRENT_TIMESTAMP ELSE completed_at END
       WHERE id = $5 AND couple_id = $6
       RETURNING *`,
      [title, description, is_completed, is_favorite, id, coupleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Date idea not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update date idea error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/vote', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const coupleId = await getCoupleId(req.userId!);

    if (!coupleId) {
      return res.status(400).json({ error: 'User must be part of a couple' });
    }

    const dateIdeaResult = await pool.query(
      'SELECT * FROM date_ideas WHERE id = $1 AND couple_id = $2 AND is_completed = true',
      [id, coupleId]
    );

    if (dateIdeaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Date idea not found or not completed' });
    }

    const dateIdea = dateIdeaResult.rows[0];

    await pool.query(
      'INSERT INTO date_idea_votes (date_idea_id, user_id) VALUES ($1, $2) ON CONFLICT (date_idea_id, user_id) DO NOTHING',
      [id, req.userId]
    );

    const voteCountResult = await pool.query(
      'SELECT COUNT(*) as count FROM date_idea_votes WHERE date_idea_id = $1',
      [id]
    );

    const voteCount = parseInt(voteCountResult.rows[0].count);

    if (voteCount >= 2) {
      await pool.query(
        'INSERT INTO should_do_again (couple_id, title, description, original_date_idea_id) VALUES ($1, $2, $3, $4)',
        [coupleId, dateIdea.title, dateIdea.description, id]
      );

      await pool.query('DELETE FROM date_idea_votes WHERE date_idea_id = $1', [id]);

      return res.json({ message: 'Added to "Should Do This Again" list!', moved: true });
    }

    res.json({ message: 'Vote recorded', moved: false, vote_count: voteCount });
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id/vote', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM date_idea_votes WHERE date_idea_id = $1 AND user_id = $2 RETURNING *',
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vote not found' });
    }

    res.json({ message: 'Vote removed' });
  } catch (error) {
    console.error('Remove vote error:', error);
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
      'DELETE FROM date_ideas WHERE id = $1 AND couple_id = $2 RETURNING *',
      [id, coupleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Date idea not found' });
    }

    res.json({ message: 'Date idea deleted successfully' });
  } catch (error) {
    console.error('Delete date idea error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
