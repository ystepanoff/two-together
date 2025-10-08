import React, { useState, useEffect } from 'react';

const Admin: React.FC = () => {
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load settings');
      }

      const data = await response.json();
      setAllowRegistration(data.allow_registration);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load settings');
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    setMessage('');
    setError('');

    try {
      const token = localStorage.getItem('token');
      const newValue = !allowRegistration;

      const response = await fetch('/api/admin/settings/allow_registration', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ value: newValue }),
      });

      if (!response.ok) {
        throw new Error('Failed to update setting');
      }

      setAllowRegistration(newValue);
      setMessage(`Registration ${newValue ? 'enabled' : 'disabled'} successfully`);
    } catch (err: any) {
      setError(err.message || 'Failed to update setting');
    }
  };

  if (loading) {
    return (
      <div className="settings-page">
        <div className="admin-loading">Loading admin panel...</div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-grid">
        <div className="settings-card">
          <div className="card-header">
            <h3>Registration Settings</h3>
            <p className="card-description">Control who can register for the application</p>
          </div>
          <div className="card-content">
            {error && <div className="error-message">{error}</div>}
            {message && <div className="success-message">{message}</div>}

            <div className="toggle-setting">
              <div className="toggle-info">
                <h4>Allow New User Registration</h4>
                <p>When enabled, new users can create accounts</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={allowRegistration}
                  onChange={handleToggle}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-status">
              <span className={`status-badge ${allowRegistration ? 'status-enabled' : 'status-disabled'}`}>
                {allowRegistration ? 'Registration Open' : 'Registration Closed'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
