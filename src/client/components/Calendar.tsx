import React, { useState, useEffect } from 'react';
import { CalendarEvent, DateIdea } from '../types';
import { calendarEventsApi, dateIdeasApi } from '../api';
import EventDialog from './EventDialog';
import './Calendar.css';

const Calendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [dateIdeas, setDateIdeas] = useState<DateIdea[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    loadEvents();
    loadDateIdeas();
  }, [currentDate]);

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

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, daysInPrevMonth - i),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Next month days to fill the grid
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
    });
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <h2>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
        <div className="calendar-controls">
          <button onClick={handlePreviousMonth} className="btn-secondary">←</button>
          <button onClick={handleToday} className="btn-secondary">Today</button>
          <button onClick={handleNextMonth} className="btn-secondary">→</button>
        </div>
      </div>

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
                      className="event-item"
                      onClick={(e) => handleEventClick(event, e)}
                      title={event.title}
                    >
                      {event.is_all_day && <span className="all-day-badge">📅</span>}
                      {event.title}
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
        />
      )}

      {selectedEvent && isDialogOpen && (
        <div className="event-actions">
          <button
            onClick={() => handleDeleteEvent(selectedEvent.id)}
            className="btn-danger"
          >
            Delete Event
          </button>
        </div>
      )}
    </div>
  );
};

export default Calendar;
