import React, { useState, useEffect } from 'react';
import { shouldDoAgainApi } from '../api';
import { ShouldDoAgain } from '../types';

const ShouldDoAgainList: React.FC = () => {
  const [items, setItems] = useState<ShouldDoAgain[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(10);

  useEffect(() => {
    loadItems();
  }, [page]);

  const loadItems = async () => {
    try {
      const data = await shouldDoAgainApi.getAll(page, pageSize);
      setItems(data.items);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to load should do again list:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to remove this item?')) return;

    try {
      await shouldDoAgainApi.delete(id);
      // If we're on a page that would be empty after deletion, go to previous page
      if (items.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        loadItems();
      }
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const totalPages = Math.ceil(total / pageSize);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return (
    <div className="section">
      <h2>Should Do This Again ❤️</h2>

      <div className="again-list">
        {items.length === 0 ? (
          <div className="empty-state">
            <p>No dates to repeat yet. Complete and mark your favorite dates!</p>
          </div>
        ) : (
          <>
            {items.map((item) => (
              <div key={item.id} className="again-item">
                <div className="again-title">{item.title}</div>
                {item.description && (
                  <div className="again-description">{item.description}</div>
                )}
                <div className="again-actions">
                  <button
                    className="btn-small btn-delete"
                    onClick={() => handleDelete(item.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

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
          </>
        )}
      </div>
    </div>
  );
};

export default ShouldDoAgainList;
