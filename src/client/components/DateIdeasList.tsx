import React, { useState, useEffect } from 'react';
import { dateIdeasApi, shouldDoAgainApi } from '../api';
import { DateIdea } from '../types';

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

  useEffect(() => {
    loadIdeas();
  }, [page]);

  const loadIdeas = async () => {
    try {
      const data = await dateIdeasApi.getAll(page, pageSize);
      setIdeas(data.items);
      setTotal(data.total);
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

  const handleToggleFavorite = async (idea: DateIdea) => {
    try {
      await dateIdeasApi.update(idea.id, { is_favorite: !idea.is_favorite });
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

  const totalPages = Math.ceil(total / pageSize);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  const filteredIdeas = ideas.filter((idea) => {
    const query = searchQuery.toLowerCase();
    return (
      idea.title.toLowerCase().includes(query) ||
      idea.description.toLowerCase().includes(query)
    );
  });

  return (
    <div className="section">
      <h2>Date Ideas</h2>

      <div className="search-box">
        <input
          type="text"
          placeholder="Search date ideas..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
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
        <button type="submit">Add Date Idea</button>
      </form>

      <div className="ideas-list">
        {filteredIdeas.length === 0 ? (
          <div className="empty-state">
            <p>{ideas.length === 0 ? 'No date ideas yet. Add your first one above!' : 'No matching date ideas found.'}</p>
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
                      Save
                    </button>
                    <button className="btn-cancel" onClick={handleCancelEdit}>
                      Cancel
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
                      <div
                        className={`idea-title ${
                          idea.is_completed ? 'completed' : ''
                        }`}
                      >
                        {idea.is_favorite && '⭐ '}
                        {idea.title}
                      </div>
                      {idea.description && (
                        <div className="idea-description">{idea.description}</div>
                      )}
                    </div>
                  </div>
                  <div className="idea-actions">
                    <button
                      className="btn-small btn-favorite"
                      onClick={() => handleToggleFavorite(idea)}
                    >
                      {idea.is_favorite ? 'Unfavorite' : 'Favorite'}
                    </button>
                    {idea.is_completed && (
                      <>
                        {idea.current_user_voted ? (
                          <button
                            className="btn-small btn-voted"
                            onClick={() => handleRemoveVote(idea)}
                          >
                            Remove Vote ({idea.vote_count || 0}/2)
                          </button>
                        ) : (
                          <button
                            className="btn-small btn-vote"
                            onClick={() => handleVote(idea)}
                          >
                            Vote to Do Again ({idea.vote_count || 0}/2)
                          </button>
                        )}
                      </>
                    )}
                    <button
                      className="btn-small btn-edit"
                      onClick={() => handleStartEdit(idea)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-small btn-delete"
                      onClick={() => handleDelete(idea.id)}
                    >
                      Delete
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
    </div>
  );
};

export default DateIdeasList;
