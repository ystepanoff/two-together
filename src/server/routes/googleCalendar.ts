import express, { Response } from 'express';
import { google } from 'googleapis';
import pool from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { syncEventToGoogle } from '../services/googleCalendarSync';

const router = express.Router();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google-calendar/callback'
);

router.get('/connect', authenticateToken, async (req: AuthRequest, res: Response) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar'],
    state: req.userId!.toString(),
  });

  res.json({ authUrl });
});

router.get('/callback', async (req, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).send('Missing code or state parameter');
    }

    const userId = parseInt(state as string);

    const { tokens } = await oauth2Client.getToken(code as string);

    await pool.query(
      `UPDATE users
       SET google_access_token = $1,
           google_refresh_token = $2,
           google_token_expiry = $3
       WHERE id = $4`,
      [
        tokens.access_token,
        tokens.refresh_token || null,
        tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        userId
      ]
    );

    res.send(`
      <html>
        <body>
          <h1>Google Calendar Connected Successfully!</h1>
          <p>You can close this window and return to TwoTogether.</p>
          <script>
            setTimeout(() => window.close(), 2000);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error in Google OAuth callback:', error);
    res.status(500).send('Failed to connect Google Calendar');
  }
});

router.get('/status', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT google_access_token FROM users WHERE id = $1',
      [req.userId]
    );

    const isConnected = !!(result.rows[0]?.google_access_token);
    res.json({ isConnected });
  } catch (error) {
    console.error('Error checking Google Calendar status:', error);
    res.status(500).json({ error: 'Failed to check connection status' });
  }
});

router.post('/disconnect', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await pool.query(
      `UPDATE users
       SET google_access_token = NULL,
           google_refresh_token = NULL,
           google_token_expiry = NULL
       WHERE id = $1`,
      [req.userId]
    );

    res.json({ message: 'Google Calendar disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting Google Calendar:', error);
    res.status(500).json({ error: 'Failed to disconnect Google Calendar' });
  }
});

router.post('/sync-all', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const coupleResult = await pool.query(
      'SELECT id FROM couples WHERE user1_id = $1 OR user2_id = $1',
      [req.userId]
    );

    if (coupleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Couple not found' });
    }

    const coupleId = coupleResult.rows[0].id;

    const eventsResult = await pool.query(
      'SELECT * FROM calendar_events WHERE couple_id = $1 ORDER BY start_datetime ASC',
      [coupleId]
    );

    const events = eventsResult.rows;
    let syncedCount = 0;
    const failedEvents: Array<{ id: number; title: string; error: string }> = [];

    for (const event of events) {
      try {
        await syncEventToGoogle(event, coupleId);
        syncedCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Failed to sync event ${event.id} ("${event.title}"):`, errorMessage);
        failedEvents.push({
          id: event.id,
          title: event.title,
          error: errorMessage
        });
      }
    }

    res.json({
      message: 'Sync completed',
      total: events.length,
      synced: syncedCount,
      errors: failedEvents.length,
      failedEvents: failedEvents.length > 0 ? failedEvents : undefined
    });
  } catch (error) {
    console.error('Error syncing all events:', error);
    res.status(500).json({ error: 'Failed to sync events' });
  }
});

export default router;
