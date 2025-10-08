import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface SettingsProps {
  backgroundImage: string;
  onBackgroundImageChange: (imageUrl: string) => void;
}

const Settings: React.FC<SettingsProps> = ({ backgroundImage, onBackgroundImageChange }) => {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [bgMessage, setBgMessage] = useState('');
  const [bgError, setBgError] = useState('');

  const handleBackgroundImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBgMessage('');
    setBgError('');

    if (!file.type.startsWith('image/')) {
      setBgError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setBgError('Image size must be less than 5MB');
      return;
    }

    setBgMessage('Uploading image...');

    const reader = new FileReader();
    reader.onerror = () => {
      setBgMessage('');
      setBgError('Failed to read image file');
    };

    reader.onload = async (event) => {
      const imageUrl = event.target?.result as string;

      try {
        const token = localStorage.getItem('token');

        if (!token) {
          throw new Error('You are not logged in. Please log in and try again.');
        }

        const response = await fetch('/api/couples/background', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ backgroundImage: imageUrl }),
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('You need to be paired with your partner before setting a background image');
          } else if (response.status === 401) {
            throw new Error('Your session has expired. Please log in again.');
          } else {
            throw new Error(data.error || `Failed to update background image (Status: ${response.status})`);
          }
        }

        onBackgroundImageChange(imageUrl);
        setBgMessage('Background image updated successfully! Your partner will see this too.');
      } catch (err: any) {
        console.error('Background upload error:', err);
        setBgMessage('');
        if (err.name === 'TypeError' && err.message.includes('fetch')) {
          setBgError('Cannot connect to server. Please make sure the server is running.');
        } else {
          setBgError(err.message || 'Failed to update background image');
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      setMessage('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h2>Settings</h2>
      </div>

      <div className="settings-section">
          <h3>Background Image</h3>
          {bgError && <div className="error-message">{bgError}</div>}
          {bgMessage && <div className="success-message">{bgMessage}</div>}
          <div className="background-preview">
            {backgroundImage && (
              <img src={backgroundImage} alt="Background preview" className="preview-image" />
            )}
            {!backgroundImage && (
              <div className="no-preview">No background image set</div>
            )}
          </div>
          <label htmlFor="bg-upload" className="btn" style={{ cursor: 'pointer', display: 'inline-block' }}>
            Choose Background Image
            <input
              id="bg-upload"
              type="file"
              accept="image/*"
              onChange={handleBackgroundImageChange}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        <div className="settings-section">
          <h3>Change Password</h3>
          {error && <div className="error-message">{error}</div>}
          {message && <div className="success-message">{message}</div>}
          <form onSubmit={handlePasswordChange} className="password-form">
            <div className="form-group">
              <label htmlFor="current-password">Current Password</label>
              <input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="new-password">New Password</label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirm-password">Confirm New Password</label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn">
              Change Password
            </button>
          </form>
        </div>
    </div>
  );
};

export default Settings;
