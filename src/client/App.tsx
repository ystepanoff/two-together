import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import AuthForm from './components/AuthForm';
import MainContent from './components/MainContent';
import Settings from './components/Settings';
import Admin from './components/Admin';
import Calendar from './components/Calendar';
import { User, PartnerStatus } from './types';
import { authApi } from './api';
import './App.css';

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string>('');
  const [partnerStatus, setPartnerStatus] = useState<PartnerStatus | null>(null);
  const [partnerUsername, setPartnerUsername] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      loadPartnerStatus();
      loadBackgroundImage();
      checkAdmin();
    }
  }, []);

  const loadPartnerStatus = async () => {
    try {
      const status = await authApi.getPartnerStatus();
      setPartnerStatus(status);
    } catch (error) {
      console.error('Failed to load partner status:', error);
    }
  };

  const loadBackgroundImage = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/couples/background', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.backgroundImage) {
        setBackgroundImage(data.backgroundImage);
      }
    } catch (error) {
      console.error('Failed to load background image:', error);
    }
  };

  const checkAdmin = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/check', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setIsAdmin(data.is_admin || false);
    } catch (error) {
      console.error('Failed to check admin status:', error);
    }
  };

  const handleLogin = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    loadPartnerStatus();
    loadBackgroundImage();
    checkAdmin();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setPartnerStatus(null);
  };

  const handlePairPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerUsername.trim()) return;

    try {
      await authApi.pair(partnerUsername);
      alert('Successfully paired with partner!');
      setPartnerUsername('');
      loadPartnerStatus();
    } catch (error: any) {
      alert(error.message || 'Failed to pair with partner');
    }
  };

  const handleBackgroundImageChange = (imageUrl: string) => {
    setBackgroundImage(imageUrl);
  };

  if (!token) {
    return (
      <div className="app" style={{ '--background-image': `url(${backgroundImage})` } as React.CSSProperties}>
        <AuthForm onLogin={handleLogin} />
      </div>
    );
  }

  if (token && partnerStatus && !partnerStatus.hasPair) {
    return (
      <div className="app" style={{ '--background-image': `url(${backgroundImage})` } as React.CSSProperties}>
        <div className="main-container">
          <header className="header">
            <h1>Two Together 💕</h1>
            <div className="header-right">
              {user && <span className="username">Hi, {user.username}!</span>}
              <button onClick={handleLogout} className="btn-secondary">
                Logout
              </button>
            </div>
          </header>

          <div className="pairing-screen">
            <div className="pairing-card">
              <h2>Pair with Your Partner</h2>
              <p>To start using Two Together, you need to pair with your partner.</p>
              <p>Enter their username below:</p>
              <form onSubmit={handlePairPartner} className="pairing-form">
                <input
                  type="text"
                  placeholder="Partner's username"
                  value={partnerUsername}
                  onChange={(e) => setPartnerUsername(e.target.value)}
                  required
                />
                <button type="submit">Pair</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app" style={{ '--background-image': `url(${backgroundImage})` } as React.CSSProperties}>
      <div className="main-container">
        <header className="header">
          <h1>Two Together 💕</h1>
          <div className="header-right">
            {user && <span className="username">Hi, {user.username}!</span>}
            {partnerStatus?.partner && (
              <span className="partner-info">💑 Paired with {partnerStatus.partner.username}</span>
            )}
            <button
              onClick={() => navigate('/')}
              className="btn-secondary"
              disabled={location.pathname === '/'}
            >
              Home
            </button>
            <button
              onClick={() => navigate('/calendar')}
              className="btn-secondary"
              disabled={location.pathname === '/calendar'}
            >
              Calendar
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="btn-secondary"
              disabled={location.pathname === '/settings'}
            >
              Settings
            </button>
            {isAdmin && (
              <button
                onClick={() => navigate('/admin')}
                className="btn-secondary"
                disabled={location.pathname === '/admin'}
              >
                Admin
              </button>
            )}
            <button onClick={handleLogout} className="btn-secondary">
              Logout
            </button>
          </div>
        </header>

        <Routes>
          <Route path="/" element={<MainContent />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route
            path="/settings"
            element={
              <Settings
                backgroundImage={backgroundImage}
                onBackgroundImageChange={handleBackgroundImageChange}
              />
            }
          />
          {isAdmin && <Route path="/admin" element={<Admin />} />}
        </Routes>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
