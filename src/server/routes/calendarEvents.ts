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

// Get calendar events for a date range
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const coupleId = await getCoupleId(req.userId!);

    if (!coupleId) {
      return res.json([]);
    }

    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: 'Start and end dates are required' });
    }

    const result = await pool.query(
      `SELECT * FROM calendar_events
       WHERE couple_id = $1
       AND (
         (start_datetime >= $2 AND start_datetime <= $3)
         OR (end_datetime >= $2 AND end_datetime <= $3)
         OR (start_datetime <= $2 AND end_datetime >= $3)
       )
       ORDER BY start_datetime ASC`,
      [coupleId, start, end]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

// Create a new calendar event
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const coupleId = await getCoupleId(req.userId!);

    if (!coupleId) {
      return res.status(404).json({ error: 'Couple not found' });
    }

    const { title, description, start_datetime, end_datetime, is_all_day, date_idea_id } = req.body;

    if (!title || !start_datetime || !end_datetime) {
      return res.status(400).json({ error: 'Title, start_datetime, and end_datetime are required' });
    }

    if (new Date(end_datetime) < new Date(start_datetime)) {
      return res.status(400).json({ error: 'End date/time cannot be before start date/time' });
    }

    const result = await pool.query(
      `INSERT INTO calendar_events
       (couple_id, title, description, start_datetime, end_datetime, is_all_day, date_idea_id, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        coupleId,
        title,
        description || null,
        start_datetime,
        end_datetime,
        is_all_day || false,
        date_idea_id || null,
        req.userId
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating calendar event:', error);
    res.status(500).json({ error: 'Failed to create calendar event' });
  }
});

// Update a calendar event
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const coupleId = await getCoupleId(req.userId!);

    if (!coupleId) {
      return res.status(404).json({ error: 'Couple not found' });
    }

    const { id } = req.params;
    const { title, description, start_datetime, end_datetime, is_all_day } = req.body;

    // Verify the event belongs to the couple
    const checkResult = await pool.query(
      'SELECT id FROM calendar_events WHERE id = $1 AND couple_id = $2',
      [id, coupleId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Calendar event not found' });
    }

    const existingEvent = await pool.query(
      'SELECT start_datetime, end_datetime FROM calendar_events WHERE id = $1',
      [id]
    );

    const finalStartDatetime = start_datetime || existingEvent.rows[0].start_datetime;
    const finalEndDatetime = end_datetime || existingEvent.rows[0].end_datetime;

    if (new Date(finalEndDatetime) < new Date(finalStartDatetime)) {
      return res.status(400).json({ error: 'End date/time cannot be before start date/time' });
    }

    const result = await pool.query(
      `UPDATE calendar_events
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           start_datetime = COALESCE($3, start_datetime),
           end_datetime = COALESCE($4, end_datetime),
           is_all_day = COALESCE($5, is_all_day),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND couple_id = $7
       RETURNING *`,
      [title, description, start_datetime, end_datetime, is_all_day, id, coupleId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating calendar event:', error);
    res.status(500).json({ error: 'Failed to update calendar event' });
  }
});

// Delete a calendar event
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const coupleId = await getCoupleId(req.userId!);

    if (!coupleId) {
      return res.status(404).json({ error: 'Couple not found' });
    }

    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM calendar_events WHERE id = $1 AND couple_id = $2 RETURNING id',
      [id, coupleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Calendar event not found' });
    }

    res.json({ message: 'Calendar event deleted successfully' });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    res.status(500).json({ error: 'Failed to delete calendar event' });
  }
});

export default router;
