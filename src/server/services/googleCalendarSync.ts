import { google } from 'googleapis';
import pool from '../db';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google-calendar/callback'
);

interface CalendarEvent {
  id: number;
  title: string;
  description?: string;
  start_datetime: string;
  end_datetime: string;
  is_all_day: boolean;
  google_event_id?: string;
}

async function getAuthClientForUser(userId: number) {
  const result = await pool.query(
    'SELECT google_access_token, google_refresh_token, google_token_expiry FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0 || !result.rows[0].google_access_token) {
    return null;
  }

  const { google_access_token, google_refresh_token, google_token_expiry } = result.rows[0];

  oauth2Client.setCredentials({
    access_token: google_access_token,
    refresh_token: google_refresh_token,
    expiry_date: google_token_expiry ? new Date(google_token_expiry).getTime() : undefined,
  });

  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await pool.query(
        `UPDATE users
         SET google_access_token = $1,
             google_token_expiry = $2
         WHERE id = $3`,
        [
          tokens.access_token,
          tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          userId
        ]
      );
    }
  });

  return oauth2Client;
}

async function getUsersWithGoogleCalendar(coupleId: number): Promise<number[]> {
  const result = await pool.query(
    `SELECT u.id
     FROM users u
     JOIN couples c ON u.id = c.user1_id OR u.id = c.user2_id
     WHERE c.id = $1 AND u.google_access_token IS NOT NULL`,
    [coupleId]
  );

  return result.rows.map(row => row.id);
}

export async function syncEventToGoogle(event: CalendarEvent, coupleId: number) {
  const userIds = await getUsersWithGoogleCalendar(coupleId);

  for (const userId of userIds) {
    const auth = await getAuthClientForUser(userId);
    if (!auth) continue;

    const calendar = google.calendar({ version: 'v3', auth });

    const startDate = new Date(event.start_datetime);
    const endDate = new Date(event.end_datetime);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const googleEvent = {
      summary: event.title,
      description: event.description || '',
      start: event.is_all_day
        ? { date: startDateStr }
        : { dateTime: startDate.toISOString(), timeZone: 'UTC' },
      end: event.is_all_day
        ? { date: endDateStr }
        : { dateTime: endDate.toISOString(), timeZone: 'UTC' },
    };

    try {
      if (event.google_event_id) {
        await calendar.events.update({
          calendarId: 'primary',
          eventId: event.google_event_id,
          requestBody: googleEvent,
        });
      } else {
        const response = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: googleEvent,
        });

        if (response.data.id) {
          await pool.query(
            'UPDATE calendar_events SET google_event_id = $1 WHERE id = $2',
            [response.data.id, event.id]
          );
        }
      }
    } catch (error) {
      console.error(`Error syncing event to Google Calendar for user ${userId}:`, error);
    }
  }
}

export async function deleteEventFromGoogle(googleEventId: string, coupleId: number) {
  const userIds = await getUsersWithGoogleCalendar(coupleId);

  for (const userId of userIds) {
    const auth = await getAuthClientForUser(userId);
    if (!auth) continue;

    const calendar = google.calendar({ version: 'v3', auth });

    try {
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: googleEventId,
      });
    } catch (error) {
      console.error(`Error deleting event from Google Calendar for user ${userId}:`, error);
    }
  }
}
