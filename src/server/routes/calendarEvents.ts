import express, { Response } from 'express';
import pool from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import ical, { ICalCalendar } from 'ical-generator';
import { syncEventToGoogle, deleteEventFromGoogle } from '../services/googleCalendarSync';

const router = express.Router();

async function getCoupleId(userId: number): Promise<number | null> {
  const result = await pool.query(
    'SELECT id FROM couples WHERE user1_id = $1 OR user2_id = $1',
    [userId]
  );
  return result.rows.length > 0 ? result.rows[0].id : null;
}

router.get('/subscription-url', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const coupleId = await getCoupleId(req.userId!);

    if (!coupleId) {
      return res.status(404).json({ error: 'Couple not found' });
    }

    const result = await pool.query(
      'SELECT calendar_token FROM couples WHERE id = $1',
      [coupleId]
    );

    if (result.rows.length === 0 || !result.rows[0].calendar_token) {
      return res.status(404).json({ error: 'Calendar token not found' });
    }

    const token = result.rows[0].calendar_token;
    const host = req.get('host');
    const subscriptionUrl = `https://${host}/api/calendar-events/ical/${coupleId}/${token}`;

    res.json({ subscriptionUrl });
  } catch (error) {
    console.error('Error getting subscription URL:', error);
    res.status(500).json({ error: 'Failed to get subscription URL' });
  }
});

router.get('/by-date-idea/:dateIdeaId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const coupleId = await getCoupleId(req.userId!);

    if (!coupleId) {
      return res.json([]);
    }

    const { dateIdeaId } = req.params;

    const result = await pool.query(
      `SELECT * FROM calendar_events
       WHERE couple_id = $1
       AND date_idea_id = $2
       AND end_datetime >= CURRENT_TIMESTAMP
       ORDER BY start_datetime ASC`,
      [coupleId, dateIdeaId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching calendar events by date idea:', error);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

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

    const createdEvent = result.rows[0];

    syncEventToGoogle(createdEvent, coupleId).catch(err =>
      console.error('Failed to sync event to Google Calendar:', err)
    );

    res.status(201).json(createdEvent);
  } catch (error) {
    console.error('Error creating calendar event:', error);
    res.status(500).json({ error: 'Failed to create calendar event' });
  }
});

router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const coupleId = await getCoupleId(req.userId!);

    if (!coupleId) {
      return res.status(404).json({ error: 'Couple not found' });
    }

    const { id } = req.params;
    const { title, description, start_datetime, end_datetime, is_all_day } = req.body;

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

    const updatedEvent = result.rows[0];

    syncEventToGoogle(updatedEvent, coupleId).catch(err =>
      console.error('Failed to sync updated event to Google Calendar:', err)
    );

    res.json(updatedEvent);
  } catch (error) {
    console.error('Error updating calendar event:', error);
    res.status(500).json({ error: 'Failed to update calendar event' });
  }
});

router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const coupleId = await getCoupleId(req.userId!);

    if (!coupleId) {
      return res.status(404).json({ error: 'Couple not found' });
    }

    const { id } = req.params;

    const eventResult = await pool.query(
      'SELECT google_event_id FROM calendar_events WHERE id = $1 AND couple_id = $2',
      [id, coupleId]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Calendar event not found' });
    }

    const googleEventId = eventResult.rows[0].google_event_id;

    const result = await pool.query(
      'DELETE FROM calendar_events WHERE id = $1 AND couple_id = $2 RETURNING id',
      [id, coupleId]
    );

    if (googleEventId) {
      deleteEventFromGoogle(googleEventId, coupleId).catch(err =>
        console.error('Failed to delete event from Google Calendar:', err)
      );
    }

    res.json({ message: 'Calendar event deleted successfully' });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    res.status(500).json({ error: 'Failed to delete calendar event' });
  }
});

router.get('/ical/:coupleId/:token', async (req, res: Response) => {
  try {
    const { coupleId, token } = req.params;

    const coupleResult = await pool.query(
      'SELECT id FROM couples WHERE id = $1 AND calendar_token = $2',
      [coupleId, token]
    );

    if (coupleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Calendar not found or invalid token' });
    }

    const eventsResult = await pool.query(
      `SELECT * FROM calendar_events
       WHERE couple_id = $1
       ORDER BY start_datetime ASC`,
      [coupleId]
    );

    const calendar = ical({
      name: 'TwoTogether Calendar',
      description: 'Shared calendar for couples',
      timezone: 'UTC',
      ttl: 3600,
    });

    eventsResult.rows.forEach((event: any) => {
      const startDate = new Date(event.start_datetime);
      const endDate = new Date(event.end_datetime);

      calendar.createEvent({
        id: `${event.id}@twotogether`,
        start: startDate,
        end: endDate,
        summary: event.title,
        description: event.description || '',
        allDay: event.is_all_day,
        created: new Date(event.created_at),
        lastModified: new Date(event.updated_at),
      });
    });

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="calendar.ics"');
    res.send(calendar.toString());
  } catch (error) {
    console.error('Error generating iCal feed:', error);
    res.status(500).json({ error: 'Failed to generate calendar feed' });
  }
});

export default router;
