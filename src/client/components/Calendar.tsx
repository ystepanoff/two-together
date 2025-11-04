import React, { useState, useEffect } from 'react';
import { CalendarEvent, DateIdea } from '../types';
import { calendarEventsApi, dateIdeasApi, googleCalendarApi } from '../api';
import EventDialog from './EventDialog';
import './Calendar.css';

const Calendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [dateIdeas, setDateIdeas] = useState<DateIdea[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [subscriptionUrl, setSubscriptionUrl] = useState<string>('');
  const [showSubscriptionInfo, setShowSubscriptionInfo] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);

  useEffect(() => {
    loadEvents();
    loadDateIdeas();
    loadSubscriptionUrl();
    loadGoogleStatus();
  }, [currentDate]);

  const loadSubscriptionUrl = async () => {
    try {
      const { subscriptionUrl: url } = await calendarEventsApi.getSubscriptionUrl();
      setSubscriptionUrl(url);
    } catch (error) {
      console.error('Failed to load subscription URL:', error);
    }
  };

  const loadGoogleStatus = async () => {
    try {
      const { isConnected } = await googleCalendarApi.getStatus();
      setIsGoogleConnected(isConnected);
    } catch (error) {
      console.error('Failed to load Google Calendar status:', error);
    }
  };

  const handleGoogleConnect = async () => {
    try {
      const { authUrl } = await googleCalendarApi.getConnectUrl();
      window.open(authUrl, '_blank', 'width=600,height=700');
      setTimeout(() => loadGoogleStatus(), 3000);
    } catch (error) {
      console.error('Failed to connect Google Calendar:', error);
      alert('Failed to connect Google Calendar');
    }
  };

  const handleGoogleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Google Calendar?')) return;

    try {
      await googleCalendarApi.disconnect();
      setIsGoogleConnected(false);
      alert('Google Calendar disconnected successfully');
    } catch (error) {
      console.error('Failed to disconnect Google Calendar:', error);
      alert('Failed to disconnect Google Calendar');
    }
  };

  const handleSyncAllEvents = async () => {
    try {
      const result = await googleCalendarApi.syncAll();
      if (result.errors > 0) {
        alert(`Synced ${result.synced} of ${result.total} events. ${result.errors} failed.`);
      } else {
        alert(`Successfully synced ${result.synced} events to Google Calendar!`);
      }
    } catch (error) {
      console.error('Failed to sync events:', error);
      alert('Failed to sync events to Google Calendar');
    }
  };

  const loadEvents = async () => {
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

      const start = startOfMonth.toISOString();
      const end = endOfMonth.toISOString();

      const fetchedEvents = await calendarEventsApi.getEvents(start, end);
      setEvents(fetchedEvents);
    } catch (error) {
      console.error('Failed to load events:', error);
    }
  };

  const loadDateIdeas = async () => {
    try {
      const response = await dateIdeasApi.getAll(1, 100);
      setDateIdeas(response.items);
    } catch (error) {
      console.error('Failed to load date ideas:', error);
    }
  };

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setIsDialogOpen(true);
  };

  const handleSaveEvent = async (eventData: Omit<CalendarEvent, 'id' | 'couple_id' | 'created_by_user_id' | 'created_at' | 'updated_at'>) => {
    try {
      if (selectedEvent) {
        await calendarEventsApi.update(selectedEvent.id, eventData);
      }
      setIsDialogOpen(false);
      setSelectedEvent(null);
      loadEvents();
    } catch (error) {
      console.error('Failed to save event:', error);
      alert('Failed to save event');
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      await calendarEventsApi.delete(eventId);
      setIsDialogOpen(false);
      setSelectedEvent(null);
      loadEvents();
    } catch (error) {
      console.error('Failed to delete event:', error);
      alert('Failed to delete event');
    }
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, daysInPrevMonth - i),
        isCurrentMonth: false,
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  };

  const getEventsForDay = (date: Date): CalendarEvent[] => {
    return events.filter(event => {
      const eventStart = new Date(event.start_datetime);
      const eventEnd = new Date(event.end_datetime);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

      return (eventStart <= dayEnd && eventEnd >= dayStart);
    }).sort((a, b) => {
      if (a.is_all_day && !b.is_all_day) return -1;
      if (!a.is_all_day && b.is_all_day) return 1;
      return new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime();
    });
  };

  const formatEventTime = (event: CalendarEvent): string => {
    if (event.is_all_day) {
      return 'All day';
    }

    const start = new Date(event.start_datetime);
    const end = new Date(event.end_datetime);

    const formatTime = (date: Date) => {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    };

    const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    if (startDate.getTime() !== endDate.getTime()) {
      return formatTime(start);
    }

    return `${formatTime(start)} - ${formatTime(end)}`;
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const copySubscriptionUrl = () => {
    navigator.clipboard.writeText(subscriptionUrl);
    alert('Subscription URL copied to clipboard!');
  };

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <h2>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
        <div className="calendar-controls">
          <button onClick={handlePreviousMonth} className="btn-secondary">←</button>
          <button onClick={handleToday} className="btn-secondary">Today</button>
          <button onClick={handleNextMonth} className="btn-secondary">→</button>
          <button onClick={() => setShowSubscriptionInfo(!showSubscriptionInfo)} className="btn-secondary">
            Sync Calendar
          </button>
        </div>
      </div>

      {showSubscriptionInfo && subscriptionUrl && (
        <div className="subscription-info">
          <h3>Calendar Sync Options</h3>

          <div className="sync-option">
            <h4>Google Calendar (Instant Sync)</h4>
            {isGoogleConnected ? (
              <div className="google-connected">
                <p>✓ Google Calendar is connected - events sync instantly!</p>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button onClick={handleSyncAllEvents} className="btn-primary">
                    Sync All Events
                  </button>
                  <button onClick={handleGoogleDisconnect} className="btn-secondary">
                    Disconnect Google Calendar
                  </button>
                </div>
              </div>
            ) : (
              <div className="google-disconnected">
                <p>Connect your Google Calendar for instant syncing of events.</p>
                <button onClick={handleGoogleConnect} className="btn-primary">
                  Connect Google Calendar
                </button>
              </div>
            )}
          </div>

          <div className="sync-divider">OR</div>

          <div className="sync-option">
            <h4>iCal Subscription (Apple Calendar, etc.)</h4>
            <p>Use this URL to subscribe with Apple Calendar or any calendar app that supports iCal. Updates sync every 15-60 minutes.</p>
            <div className="subscription-url-container">
              <input
                type="text"
                value={subscriptionUrl}
                readOnly
                className="subscription-url-input"
              />
              <button onClick={copySubscriptionUrl} className="btn-primary">Copy URL</button>
            </div>
            <div className="sync-instructions">
              <h4>How to subscribe:</h4>
              <div className="instruction-section">
                <strong>Apple Calendar (iPhone/Mac):</strong>
                <ol>
                  <li>Copy the URL above</li>
                  <li>Open Calendar app</li>
                  <li>Go to File → New Calendar Subscription (Mac) or Settings → Accounts → Add Account → Other → Add Subscribed Calendar (iPhone)</li>
                  <li>Paste the URL and click Subscribe</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="calendar-grid">
        <div className="calendar-day-names">
          {dayNames.map(day => (
            <div key={day} className="calendar-day-name">{day}</div>
          ))}
        </div>

        <div className="calendar-days">
          {renderCalendar().map((day, index) => {
            const dayEvents = getEventsForDay(day.date);
            return (
              <div
                key={index}
                className={`calendar-day ${!day.isCurrentMonth ? 'other-month' : ''} ${isToday(day.date) ? 'today' : ''}`}
              >
                <div className="day-number">{day.date.getDate()}</div>
                <div className="day-events">
                  {dayEvents.map(event => (
                    <div
                      key={event.id}
                      className={`event-item ${event.is_all_day ? 'all-day-event' : 'timed-event'}`}
                      onClick={(e) => handleEventClick(event, e)}
                      title={`${event.title}\n${formatEventTime(event)}`}
                    >
                      <div className="event-time">{formatEventTime(event)}</div>
                      <div className="event-title">{event.title}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isDialogOpen && selectedEvent && (
        <EventDialog
          event={selectedEvent}
          dateIdeas={dateIdeas}
          onSave={handleSaveEvent}
          onClose={() => {
            setIsDialogOpen(false);
            setSelectedEvent(null);
          }}
          onDelete={handleDeleteEvent}
        />
      )}
    </div>
  );
};

export default Calendar;
