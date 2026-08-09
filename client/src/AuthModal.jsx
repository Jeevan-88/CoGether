import React, { useState } from 'react';
import { X, Lock, Mail, User, Sparkles, ArrowRight } from 'lucide-react';
import './AuthModal.css';

export default function AuthModal({ onClose, onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const fillDemo = () => {
    setEmail('demo@teleparty.com');
    setPassword('password123');
    setName('Alex Rivera');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password || (isRegister && !name)) {
      setError('Please fill in all fields');
      return;
    }

    // Mock successful auth login response
    const mockUser = {
      id: 'u_' + Date.now(),
      name: name || (email.split('@')[0]),
      email,
      plan: 'premium'
    };

    onLoginSuccess(mockUser);
    onClose();
  };

  return (
    <div className="modal-overlay fade-in">
      <div className="auth-card">
        <button className="modal-close" onClick={onClose}>
          <X size={18} />
        </button>

        <div className="auth-header">
          <div className="auth-icon-badge">
            <Sparkles size={20} className="sparkle-icon" />
          </div>
          <h2>{isRegister ? 'Create TeleParty Account' : 'Welcome Back'}</h2>
          <p>Access your encrypted rooms and watch parties across devices.</p>
        </div>

        {error && <div className="auth-error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {isRegister && (
            <div className="auth-input-field">
              <label>Full Name</label>
              <div className="input-with-icon">
                <User size={16} />
                <input
                  type="text"
                  placeholder="Alex Rivera"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="auth-input-field">
            <label>Email Address</label>
            <div className="input-with-icon">
              <Mail size={16} />
              <input
                type="email"
                placeholder="name@teleparty.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="auth-input-field">
            <label>Password</label>
            <div className="input-with-icon">
              <Lock size={16} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="auth-submit-btn">
            {isRegister ? 'Create Account' : 'Log In'} <ArrowRight size={16} />
          </button>
        </form>

        <button type="button" className="demo-fill-btn" onClick={fillDemo}>
          ⚡ Auto-Fill Demo Credentials
        </button>

        <div className="auth-footer-toggle">
          {isRegister ? (
            <p>Already have an account? <span onClick={() => setIsRegister(false)}>Log in</span></p>
          ) : (
            <p>Don't have an account yet? <span onClick={() => setIsRegister(true)}>Sign up</span></p>
          )}
        </div>
      </div>
    </div>
  );
}
