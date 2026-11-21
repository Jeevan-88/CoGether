import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { API_URL } from '../config/api.js';
import './AuthStyles.css';

export default function LoginPage({ onNavigate, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const navigateTo = (path) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter your email address');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (response.status === 429 || data.error?.code === 'ACCOUNT_LOCKED') {
          setErrorMessage(
            data.error?.message || 'Account temporarily locked due to excessive failed attempts. Please wait 15 minutes.'
          );
        } else {
          setErrorMessage(data.error?.message || data.message || 'Invalid email or password.');
        }
        return;
      }

      if (data.accessToken) {
        localStorage.setItem('cogether_access_token', data.accessToken);
      }
      if (data.refreshToken) {
        localStorage.setItem('cogether_refresh_token', data.refreshToken);
      }

      setSuccessMessage('Logged in successfully! Redirecting...');

      if (onLoginSuccess) {
        onLoginSuccess(data.user);
      }

      setTimeout(() => {
        navigateTo('/dashboard');
      }, 600);
    } catch (err) {
      setErrorMessage('Network connection error. Please verify the server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card-container">
        <div className="auth-header">
          <a href="/" onClick={(e) => { e.preventDefault(); navigateTo('/'); }} className="auth-brand-logo">
            Co<span>Gether</span>
          </a>
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Sign in to your CoGether account to jump into rooms and live spaces.</p>
        </div>

        {errorMessage && (
          <div className="auth-alert-error" role="alert" style={{ marginBottom: '20px' }}>
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="auth-alert-success" role="alert" style={{ marginBottom: '20px' }}>
            <CheckCircle2 size={18} />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="auth-field-group">
            <label className="auth-label" htmlFor="login-email">Email Address</label>
            <div className="auth-input-wrapper">
              <Mail size={18} className="auth-input-icon" />
              <input
                id="login-email"
                type="email"
                className="auth-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="auth-field-group">
            <label className="auth-label" htmlFor="login-password">Password</label>
            <div className="auth-input-wrapper">
              <Lock size={18} className="auth-input-icon" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="auth-toggle-pwd"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="auth-row-options">
            <label className="auth-checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Remember me
            </label>
            <a
              href="/forgot-password"
              onClick={(e) => { e.preventDefault(); navigateTo('/forgot-password'); }}
              className="auth-forgot-link"
            >
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account?{' '}
          <a href="/signup" onClick={(e) => { e.preventDefault(); navigateTo('/signup'); }}>
            Create one
          </a>
        </div>
      </div>
    </div>
  );
}
