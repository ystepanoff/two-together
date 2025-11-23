import React, { useState, useEffect } from 'react';
import { dateIdeasApi, shouldDoAgainApi, calendarEventsApi } from '../api';
import { DateIdea, CalendarEvent } from '../types';
import EventDialog from './EventDialog';

const DateIdeasList: React.FC = () => {
  const [ideas, setIdeas] = useState<DateIdea[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(5);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'voted'>('all');
  const [isCalendarDialogOpen, setIsCalendarDialogOpen] = useState(false);
  const [selectedDateIdea, setSelectedDateIdea] = useState<DateIdea | null>(null);
  const [dateIdeaEvents, setDateIdeaEvents] = useState<Record<number, CalendarEvent[]>>({});

  useEffect(() => {
    loadIdeas();
  }, [page]);

  const loadIdeas = async () => {
    try {
      const data = await dateIdeasApi.getAll(page, pageSize);
      setIdeas(data.items);
      setTotal(data.total);

      const eventsMap: Record<number, CalendarEvent[]> = {};
      await Promise.all(
        data.items.map(async (idea) => {
          try {
            const events = await calendarEventsApi.getEventsByDateIdea(idea.id);
            eventsMap[idea.id] = events;
          } catch (error) {
            console.error(`Failed to load events for idea ${idea.id}:`, error);
          }
        })
      );
      setDateIdeaEvents(eventsMap);
    } catch (error) {
      console.error('Failed to load date ideas:', error);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      await dateIdeasApi.create(newTitle, newDescription);
      setNewTitle('');
      setNewDescription('');
      setPage(1);
      loadIdeas();
    } catch (error) {
      console.error('Failed to add date idea:', error);
    }
  };

  const handleToggleComplete = async (idea: DateIdea) => {
    try {
      await dateIdeasApi.update(idea.id, { is_completed: !idea.is_completed });
      loadIdeas();
    } catch (error) {
      console.error('Failed to update date idea:', error);
    }
  };


  const handleVote = async (idea: DateIdea) => {
    try {
      const result = await dateIdeasApi.vote(idea.id);
      if (result.moved) {
        alert('Both voted! Added to "Should Do This Again" list!');
      } else {
        alert(`Vote recorded! ${result.vote_count || 0}/2 votes`);
      }
      loadIdeas();
    } catch (error) {
      console.error('Failed to vote:', error);
      alert('Failed to vote');
    }
  };

  const handleRemoveVote = async (idea: DateIdea) => {
    try {
      await dateIdeasApi.removeVote(idea.id);
      loadIdeas();
    } catch (error) {
      console.error('Failed to remove vote:', error);
      alert('Failed to remove vote');
    }
  };

  const handleStartEdit = (idea: DateIdea) => {
    setEditingId(idea.id);
    setEditTitle(idea.title);
    setEditDescription(idea.description);
  };

  const handleSaveEdit = async (id: number) => {
    try {
      await dateIdeasApi.update(id, {
        title: editTitle,
        description: editDescription,
      });
      setEditingId(null);
      loadIdeas();
    } catch (error) {
      console.error('Failed to update date idea:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditDescription('');
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this date idea?')) return;

    try {
      await dateIdeasApi.delete(id);
      if (ideas.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        loadIdeas();
      }
    } catch (error) {
      console.error('Failed to delete date idea:', error);
    }
  };

  const handleAddToCalendar = async (idea: DateIdea) => {
    try {
      const events = await calendarEventsApi.getEventsByDateIdea(idea.id);
      setDateIdeaEvents({ ...dateIdeaEvents, [idea.id]: events });
    } catch (error) {
      console.error('Failed to fetch calendar events:', error);
    }
    setSelectedDateIdea(idea);
    setIsCalendarDialogOpen(true);
  };

  const handleSaveCalendarEvent = async (eventData: any) => {
    try {
      await calendarEventsApi.create({
        ...eventData,
        date_idea_id: selectedDateIdea?.id,
      });
      if (selectedDateIdea) {
        const events = await calendarEventsApi.getEventsByDateIdea(selectedDateIdea.id);
        setDateIdeaEvents({ ...dateIdeaEvents, [selectedDateIdea.id]: events });
      }
      alert('Event added to calendar!');
    } catch (error) {
      console.error('Failed to add event to calendar:', error);
      alert('Failed to add event to calendar');
    }
  };

  const totalPages = Math.ceil(total / pageSize);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  const filteredIdeas = ideas.filter((idea) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      idea.title.toLowerCase().includes(query) ||
      idea.description.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    switch (filterStatus) {
      case 'active':
        return !idea.is_completed;
      case 'completed':
        return idea.is_completed;
      case 'voted':
        return (idea.vote_count || 0) > 0;
      case 'all':
      default:
        return true;
    }
  });

  return (
    <div className="section date-ideas-section">
      <div className="section-header">
        <h2>💡 Date Ideas</h2>
        <div className="section-stats">
          <span className="stat-badge">{total} total</span>
          <span className="stat-badge">{ideas.filter(i => i.is_completed).length} completed</span>
        </div>
      </div>

      <div className="search-box">
        <input
          type="text"
          placeholder="Search date ideas..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="filter-controls">
        <button
          className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
          onClick={() => setFilterStatus('all')}
        >
          All
        </button>
        <button
          className={`filter-btn ${filterStatus === 'active' ? 'active' : ''}`}
          onClick={() => setFilterStatus('active')}
        >
          Active
        </button>
        <button
          className={`filter-btn ${filterStatus === 'completed' ? 'active' : ''}`}
          onClick={() => setFilterStatus('completed')}
        >
          Completed
        </button>
        <button
          className={`filter-btn ${filterStatus === 'voted' ? 'active' : ''}`}
          onClick={() => setFilterStatus('voted')}
        >
          ❤️ Voted
        </button>
      </div>

      <form className="add-form" onSubmit={handleAdd}>
        <input
          type="text"
          placeholder="Date idea title..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          required
        />
        <textarea
          placeholder="Description (optional)..."
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
        />
        <button type="submit">✨ Add Date Idea</button>
      </form>

      <div className="ideas-list">
        {filteredIdeas.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              {ideas.length === 0 ? '💡' : '🔍'}
            </div>
            <h3 className="empty-title">
              {ideas.length === 0
                ? 'No Date Ideas Yet'
                : searchQuery
                ? 'No Matching Results'
                : filterStatus === 'active'
                ? 'No Active Ideas'
                : filterStatus === 'completed'
                ? 'No Completed Ideas'
                : filterStatus === 'voted'
                ? 'No Voted Ideas'
                : 'No Ideas Found'}
            </h3>
            <p className="empty-description">
              {ideas.length === 0
                ? 'Start by adding your first date idea above!'
                : searchQuery
                ? 'Try adjusting your search terms'
                : filterStatus === 'active'
                ? 'All your ideas are completed!'
                : filterStatus === 'completed'
                ? 'Complete some ideas to see them here'
                : filterStatus === 'voted'
                ? 'Vote on completed dates to see them here'
                : 'Try changing your filters'}
            </p>
          </div>
        ) : (
          filteredIdeas.map((idea) => (
            <div
              key={idea.id}
              className={`idea-item ${idea.is_completed ? 'completed' : ''}`}
            >
              {editingId === idea.id ? (
                <div className="edit-form">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                  <div className="edit-form-actions">
                    <button
                      className="btn-save"
                      onClick={() => handleSaveEdit(idea.id)}
                    >
                      ✓ Save
                    </button>
                    <button className="btn-cancel" onClick={handleCancelEdit}>
                      ✕ Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="idea-header">
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={idea.is_completed}
                      onChange={() => handleToggleComplete(idea)}
                    />
                    <div className="idea-content">
                      <div className="idea-title-row">
                        <div
                          className={`idea-title ${
                            idea.is_completed ? 'completed' : ''
                          }`}
                        >
                          {idea.title}
                        </div>
                        <div className="idea-badges">
                          {idea.is_completed && (
                            <span className="badge badge-completed">✓ Done</span>
                          )}
                          {(idea.vote_count || 0) > 0 && (
                            <span className={`badge badge-votes ${(idea.vote_count || 0) === 2 ? 'badge-votes-full' : ''}`}>
                              ❤️ {idea.vote_count || 0}/2
                            </span>
                          )}
                          {dateIdeaEvents[idea.id] && dateIdeaEvents[idea.id].length > 0 && (
                            <span className="badge badge-calendar">
                              📅 {dateIdeaEvents[idea.id].length}
                            </span>
                          )}
                        </div>
                      </div>
                      {idea.description && (
                        <div className="idea-description">{idea.description}</div>
                      )}
                    </div>
                  </div>
                  <div className="idea-actions">
                    {!idea.is_completed && (
                      <button
                        className="btn-small btn-calendar"
                        onClick={() => handleAddToCalendar(idea)}
                      >
                        📅 Calendar
                      </button>
                    )}
                    {idea.is_completed && (
                      <>
                        {idea.current_user_voted ? (
                          <button
                            className="btn-small btn-voted"
                            onClick={() => handleRemoveVote(idea)}
                          >
                            ❤️ Voted ({idea.vote_count || 0}/2)
                          </button>
                        ) : (
                          <button
                            className="btn-small btn-vote"
                            onClick={() => handleVote(idea)}
                          >
                            💚 Vote ({idea.vote_count || 0}/2)
                          </button>
                        )}
                      </>
                    )}
                    <button
                      className="btn-small btn-edit"
                      onClick={() => handleStartEdit(idea)}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className="btn-small btn-delete"
                      onClick={() => handleDelete(idea.id)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn-small"
            onClick={() => setPage(page - 1)}
            disabled={!hasPrevPage}
          >
            Previous
          </button>
          <span className="pagination-info">
            Page {page} of {totalPages} ({total} total)
          </span>
          <button
            className="btn-small"
            onClick={() => setPage(page + 1)}
            disabled={!hasNextPage}
          >
            Next
          </button>
        </div>
      )}

      {isCalendarDialogOpen && selectedDateIdea && (
        <EventDialog
          event={null}
          dateIdeas={ideas}
          initialDate={new Date()}
          initialDateIdea={selectedDateIdea}
          existingEvents={dateIdeaEvents[selectedDateIdea.id] || []}
          onSave={handleSaveCalendarEvent}
          onClose={() => {
            setIsCalendarDialogOpen(false);
            setSelectedDateIdea(null);
          }}
          onDelete={async (eventId: number) => {
            if (!confirm('Are you sure you want to delete this event?')) return;

            try {
              await calendarEventsApi.delete(eventId);
              if (selectedDateIdea) {
                const events = await calendarEventsApi.getEventsByDateIdea(selectedDateIdea.id);
                setDateIdeaEvents({ ...dateIdeaEvents, [selectedDateIdea.id]: events });
              }
              alert('Event deleted successfully!');
            } catch (error) {
              console.error('Failed to delete event:', error);
              alert('Failed to delete event');
            }
          }}
        />
      )}
    </div>
  );
};

export default DateIdeasList;
