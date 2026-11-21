import React, { useState, useEffect } from 'react';
import { 
  Tv, 
  Gamepad2, 
  ShoppingBag, 
  BookOpen, 
  LogOut, 
  ShieldCheck, 
  Clock, 
  ExternalLink,
  User,
  Sparkles,
  Lock
} from 'lucide-react';
import { API_URL } from '../config/api.js';
import './AuthStyles.css';

export default function DashboardPage({ onNavigate, onSelectService }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);

  const navigateTo = (path) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  useEffect(() => {
    let mounted = true;

    async function fetchUserProfile() {
      try {
        const token = localStorage.getItem('cogether_access_token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(`${API_URL}/api/v1/auth/me`, {
          method: 'GET',
          headers,
          credentials: 'include'
        });

        if (!res.ok) {
          // Token expired or invalid
          if (mounted) {
            localStorage.removeItem('cogether_access_token');
            localStorage.removeItem('cogether_refresh_token');
            navigateTo('/login');
          }
          return;
        }

        const data = await res.json();
        if (mounted) {
          setUserData(data.user);
        }
      } catch (err) {
        if (mounted) {
          setError('Failed to load profile. Please verify your connection.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchUserProfile();

    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const token = localStorage.getItem('cogether_access_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      await fetch(`${API_URL}/api/v1/auth/logout`, {
        method: 'POST',
        headers,
        credentials: 'include'
      });
    } catch (err) {
      console.warn('Logout network error:', err);
    } finally {
      localStorage.removeItem('cogether_access_token');
      localStorage.removeItem('cogether_refresh_token');
      navigateTo('/login');
    }
  };

  const handleLaunch = (serviceKey) => {
    if (onSelectService) {
      onSelectService(serviceKey);
    } else {
      navigateTo(`/?tab=${serviceKey}`);
    }
  };

  if (loading) {
    return (
      <div className="auth-page-wrapper">
        <div style={{ textAlign: 'center', color: '#9ca3af', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(16, 185, 129, 0.2)',
            borderTopColor: '#10b981',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <span>Securing session & loading your CoGether profile...</span>
        </div>
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div className="auth-page-wrapper">
        <div className="auth-card-container" style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#ef4444', marginBottom: '12px' }}>Authentication Required</h2>
          <p style={{ color: '#9ca3af', marginBottom: '24px' }}>Please sign in to access your dashboard.</p>
          <button
            type="button"
            className="auth-submit-btn"
            onClick={() => navigateTo('/login')}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const initial = (userData.name || userData.email || 'U').charAt(0).toUpperCase();

  return (
    <div className="dashboard-page-wrapper">
      <div className="dashboard-container">
        {/* Header Bar */}
        <div className="dashboard-header-bar">
          <div className="dashboard-user-hero">
            <div className="dashboard-avatar-circle">
              {initial}
            </div>
            <div className="dashboard-user-details">
              <h1>
                {userData.name || 'CoGether Member'}
                <span className={`dashboard-badge-pill ${userData.isVerified ? 'badge-verified' : 'badge-pending'}`}>
                  {userData.isVerified ? 'Verified' : 'Pending Verification'}
                </span>
                <span className="dashboard-badge-pill badge-role">
                  {userData.role || 'USER'}
                </span>
              </h1>
              <p>{userData.email}</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <a
              href="/"
              onClick={(e) => { e.preventDefault(); navigateTo('/'); }}
              style={{
                color: '#9ca3af',
                textDecoration: 'none',
                fontSize: '14px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              Main Site <ExternalLink size={14} />
            </a>
            <button
              type="button"
              className="dashboard-logout-btn"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              <LogOut size={16} />
              {loggingOut ? 'Signing out...' : 'Sign Out'}
            </button>
          </div>
        </div>

        {/* Account Details & Security Card */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '18px',
          padding: '24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px'
        }}>
          <div>
            <span style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Account ID</span>
            <p style={{ margin: '4px 0 0', fontSize: '13px', fontFamily: 'monospace', color: '#d1d5db' }}>{userData.id}</p>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Member Status</span>
            <p style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: 600, color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={16} /> Active Session
            </p>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Password Security</span>
            <p style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: 600, color: '#e5e7eb', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={16} color="#10b981" /> Argon2id Encrypted
            </p>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Security Session</span>
            <p style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: 600, color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={16} /> HttpOnly Rotation Enabled
            </p>
          </div>
        </div>

        {/* Four Unified Service Hubs */}
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="#10b981" /> Launch CoGether Space
          </h2>
          <div className="dashboard-services-grid">
            {/* CoWatch */}
            <div
              className="dashboard-service-card"
              onClick={() => handleLaunch('cowatch')}
              role="button"
              tabIndex={0}
            >
              <div className="dashboard-service-icon icon-watch">
                <Tv size={22} />
              </div>
              <div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 700 }}>CoWatch Cinema</h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af', lineHeight: 1.5 }}>
                  Private virtual cinema rooms with synced playback, DRM dual-track, and telepresence camera overlay.
                </p>
              </div>
            </div>

            {/* CoPlay */}
            <div
              className="dashboard-service-card"
              onClick={() => handleLaunch('coplay')}
              role="button"
              tabIndex={0}
            >
              <div className="dashboard-service-icon icon-play">
                <Gamepad2 size={22} />
              </div>
              <div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 700 }}>CoPlay Arcade</h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af', lineHeight: 1.5 }}>
                  Multiplayer game duels: 2048, Tic Tac Toe, Block Puzzle, and Clumsy Bird with instant live sync.
                </p>
              </div>
            </div>

            {/* CoShop */}
            <div
              className="dashboard-service-card"
              onClick={() => handleLaunch('coshop')}
              role="button"
              tabIndex={0}
            >
              <div className="dashboard-service-icon icon-shop">
                <ShoppingBag size={22} />
              </div>
              <div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 700 }}>CoShop Live</h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af', lineHeight: 1.5 }}>
                  Green-accented social shopping, collaborative live cart, 3D animated add-to-cart flight, and split payments.
                </p>
              </div>
            </div>

            {/* CoStudy */}
            <div
              className="dashboard-service-card"
              onClick={() => handleLaunch('costudy')}
              role="button"
              tabIndex={0}
            >
              <div className="dashboard-service-icon icon-study">
                <BookOpen size={22} />
              </div>
              <div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 700 }}>CoStudy World</h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af', lineHeight: 1.5 }}>
                  Gamified 2D learning campus, CSE department labs, shared whiteboard, and collaborative focus timer.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
