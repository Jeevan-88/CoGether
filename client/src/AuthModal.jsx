import React, { useState } from 'react';
import { X, Lock, Mail, User, Shield, ArrowRight, KeyRound } from 'lucide-react';
import './AuthModal.css';

export default function AuthModal({ onClose, onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const fillDemo = () => {
    setEmail('alex@cogether.app');
    setPassword('cogether2026');
    setName('Alex Rivera');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password || (isRegister && !name)) {
      setError('Please fill in all required fields.');
      return;
    }

    const mockUser = {
      id: 'u_' + Date.now(),
      name: name || email.split('@')[0],
      email,
      plan: 'premium'
    };

    if (onLoginSuccess) onLoginSuccess(mockUser);
    onClose();
  };

  return (
    <div className="modal-overlay fade-in">
      <div className="auth-id-card">
        {/* TOP ID-CARD HANGING LANYARD SLOT */}
        <div className="id-card-lanyard-slot" />

        <button className="modal-close" onClick={onClose} aria-label="Close modal">
          <X size={18} />
        </button>

        <div className="auth-header">
          <div className="id-card-top-tag">
            <Shield size={12} />
            <span>MEMBER IDENTITY PASS // COGETHER</span>
          </div>
          <h2>{isRegister ? 'Create Member Pass' : 'Welcome Back'}</h2>
          <p>Access your synchronized cinema rooms, arcade progress, and private desks.</p>
        </div>

        {error && <div className="auth-error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {isRegister && (
            <div className="auth-input-field">
              <label>FULL NAME</label>
              <div className="input-with-icon">
                <User size={16} />
                <input
                  type="text"
                  placeholder="Alex Rivera"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            </div>
          )}

          <div className="auth-input-field">
            <label>EMAIL ADDRESS</label>
            <div className="input-with-icon">
              <Mail size={16} />
              <input
                type="email"
                placeholder="name@cogether.app"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="auth-input-field">
            <label>PASSWORD</label>
            <div className="input-with-icon">
              <Lock size={16} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          <button type="submit" className="auth-submit-btn">
            {isRegister ? 'Claim Member Keypass' : 'Enter CoGether'} <ArrowRight size={16} />
          </button>

          <button type="button" className="demo-fill-btn" onClick={fillDemo}>
            <KeyRound size={13} /> Auto-Fill Demo Credentials
          </button>
        </form>

        <div className="auth-switch-mode">
          {isRegister ? (
            <span>
              Already hold a pass?{' '}
              <button type="button" onClick={() => setIsRegister(false)}>
                Log In
              </button>
            </span>
          ) : (
            <span>
              Don't have a keypass yet?{' '}
              <button type="button" onClick={() => setIsRegister(true)}>
                Sign Up
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
