import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setAuthErrorHandler } from '../api';

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

        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('token');
          window.location.href = '/';
          return;
        }

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('You need to be paired with your partner before setting a background image');
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

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        window.location.href = '/';
        return;
      }

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
    <div className="settings-page">
      <div className="settings-grid">
        <div className="settings-card">
          <div className="card-header">
            <h3>Background Image</h3>
            <p className="card-description">Customise your shared background image</p>
          </div>
          <div className="card-content">
            {bgError && <div className="error-message">{bgError}</div>}
            {bgMessage && <div className="success-message">{bgMessage}</div>}
            <div className="background-preview">
              {backgroundImage && (
                <img src={backgroundImage} alt="Background preview" className="preview-image" />
              )}
              {!backgroundImage && (
                <div className="no-preview">
                  <svg className="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>No background image set</span>
                </div>
              )}
            </div>
            <label htmlFor="bg-upload" className="btn btn-upload">
              {backgroundImage ? 'Change Background Image' : 'Upload Background Image'}
              <input
                id="bg-upload"
                type="file"
                accept="image/*"
                onChange={handleBackgroundImageChange}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>

        <div className="settings-card">
          <div className="card-header">
            <h3>Security</h3>
            <p className="card-description">Update your password</p>
          </div>
          <div className="card-content">
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
                  placeholder="Enter current password"
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
                  placeholder="Enter new password (min 6 characters)"
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
                  placeholder="Confirm new password"
                  required
                />
              </div>
              <button type="submit" className="btn btn-full">
                Update Password
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
