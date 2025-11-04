import React, { useState, useEffect } from 'react';
import { CalendarEvent, DateIdea } from '../types';

interface EventDialogProps {
  event: CalendarEvent | null;
  dateIdeas: DateIdea[];
  initialDate?: Date;
  initialDateIdea?: DateIdea;
  existingEvents?: CalendarEvent[];
  onSave: (event: Omit<CalendarEvent, 'id' | 'couple_id' | 'created_by_user_id' | 'created_at' | 'updated_at'>) => void;
  onClose: () => void;
  onDelete?: (eventId: number) => void;
}

const EventDialog: React.FC<EventDialogProps> = ({ event, dateIdeas, initialDate, initialDateIdea, existingEvents = [], onSave, onClose, onDelete }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [selectedDateIdeaId, setSelectedDateIdeaId] = useState<number | undefined>();

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      setIsAllDay(event.is_all_day);
      setSelectedDateIdeaId(event.date_idea_id);

      const start = new Date(event.start_datetime);
      const end = new Date(event.end_datetime);

      const formatDateForInput = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const formatTimeForInput = (date: Date) => {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
      };

      setStartDate(formatDateForInput(start));
      setEndDate(formatDateForInput(end));
      setStartTime(formatTimeForInput(start));
      setEndTime(formatTimeForInput(end));
    } else if (initialDate) {
      const year = initialDate.getFullYear();
      const month = String(initialDate.getMonth() + 1).padStart(2, '0');
      const day = String(initialDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      setStartDate(dateStr);
      setEndDate(dateStr);
      setStartTime('12:00');
      setEndTime('13:00');
    }
  }, [event, initialDate]);

  useEffect(() => {
    if (!event && initialDateIdea) {
      setTitle(initialDateIdea.title);
      setDescription(initialDateIdea.description);
      setSelectedDateIdeaId(initialDateIdea.id);
    }
  }, [initialDateIdea, event]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let start_datetime: string;
    let end_datetime: string;

    if (isAllDay) {
      start_datetime = `${startDate}T00:00:00`;
      end_datetime = `${endDate}T23:59:59`;
    } else {
      const validStartTime = startTime || '00:00';
      const validEndTime = endTime || '00:00';
      start_datetime = `${startDate}T${validStartTime}:00`;
      end_datetime = `${endDate}T${validEndTime}:00`;
    }

    const startDateTime = new Date(start_datetime);
    const endDateTime = new Date(end_datetime);

    if (endDateTime < startDateTime) {
      alert('End date/time cannot be before start date/time');
      return;
    }

    onSave({
      title,
      description,
      start_datetime,
      end_datetime,
      is_all_day: isAllDay,
      date_idea_id: selectedDateIdeaId,
    });
  };

  const handleDateIdeaSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === '') {
      setSelectedDateIdeaId(undefined);
    } else {
      const dateIdeaId = parseInt(value);
      setSelectedDateIdeaId(dateIdeaId);
      const selectedDateIdea = dateIdeas.find(di => di.id === dateIdeaId);
      if (selectedDateIdea) {
        setTitle(selectedDateIdea.title);
        setDescription(selectedDateIdea.description);
      }
    }
  };

  const formatEventDateTime = (event: CalendarEvent) => {
    const start = new Date(event.start_datetime);
    const end = new Date(event.end_datetime);

    const dateOptions: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    };
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit'
    };

    if (event.is_all_day) {
      return start.toLocaleDateString(undefined, dateOptions);
    } else {
      const dateStr = start.toLocaleDateString(undefined, dateOptions);
      const startTimeStr = start.toLocaleTimeString(undefined, timeOptions);
      const endTimeStr = end.toLocaleTimeString(undefined, timeOptions);
      return `${dateStr}, ${startTimeStr} - ${endTimeStr}`;
    }
  };

  const handleDeleteExistingEvent = async (eventId: number) => {
    if (onDelete) {
      onDelete(eventId);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{event ? 'Edit Event' : 'New Event'}</h2>

        {existingEvents.length > 0 && (
          <div className="existing-events">
            <h3>Scheduled Future Dates ({initialDateIdea?.title}):</h3>
            <ul className="event-list">
              {existingEvents.map((evt) => (
                <li key={evt.id} className="event-item-container">
                  <span className="event-item-text">{formatEventDateTime(evt)}</span>
                  {onDelete && (
                    <button
                      type="button"
                      className="btn-delete-event"
                      onClick={() => handleDeleteExistingEvent(evt.id)}
                    >
                      Delete
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Link to Date Idea *</label>
            <select value={selectedDateIdeaId || ''} onChange={handleDateIdeaSelect} required>
              <option value="" disabled>Select a date idea...</option>
              {dateIdeas.filter(di => !di.is_completed).map(dateIdea => (
                <option key={dateIdea.id} value={dateIdea.id}>
                  {dateIdea.title}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={isAllDay}
                onChange={(e) => setIsAllDay(e.target.checked)}
              />
              {' '}All Day Event
            </label>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Start Date *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setEndDate(e.target.value);
                }}
                required
              />
            </div>

            {!isAllDay && (
              <div className="form-group">
                <label>Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => {
                    setStartTime(e.target.value);
                    setEndTime(e.target.value);
                  }}
                />
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>End Date *</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>

            {!isAllDay && (
              <div className="form-group">
                <label>End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            {event && onDelete && (
              <button
                type="button"
                onClick={() => handleDeleteExistingEvent(event.id)}
                className="btn-danger"
              >
                Delete
              </button>
            )}
            <button type="submit" className="btn-primary">
              {event ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventDialog;
