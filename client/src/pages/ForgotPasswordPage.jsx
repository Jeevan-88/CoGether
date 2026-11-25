import React, { useState } from 'react';
import { Mail, AlertCircle, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { API_URL, parseApiResponse, formatNetworkError } from '../config/api.js';
import './AuthStyles.css';

export default function ForgotPasswordPage({ onNavigate }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

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

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });

      const data = await parseApiResponse(response);

      if (!response.ok || !data.success) {
        setErrorMessage(data.error?.message || data.message || 'Unable to process request.');
        return;
      }

      setSubmitted(true);
    } catch (err) {
      setErrorMessage(formatNetworkError(err));
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
          <h1 className="auth-title">Reset your password</h1>
          <p className="auth-subtitle">
            Enter the email associated with your account and we'll send a secure password reset link.
          </p>
        </div>

        {errorMessage && (
          <div className="auth-alert-error" role="alert" style={{ marginBottom: '20px' }}>
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {submitted ? (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="auth-alert-success" role="status" style={{ justifyContent: 'center' }}>
              <CheckCircle2 size={20} />
              <span>Password reset instructions sent!</span>
            </div>
            <p style={{ fontSize: '14px', color: '#9ca3af', lineHeight: 1.6, margin: '8px 0' }}>
              If an account exists for <strong style={{ color: '#ffffff' }}>{email}</strong>, you will receive an email with reset instructions valid for 1 hour.
            </p>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
              (In local development, the reset link is logged directly to the server terminal.)
            </p>
            <button
              type="button"
              className="auth-submit-btn"
              onClick={() => navigateTo('/login')}
              style={{ marginTop: '12px' }}
            >
              <ArrowLeft size={18} />
              Return to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="auth-field-group">
              <label className="auth-label" htmlFor="forgot-email">Email Address</label>
              <div className="auth-input-wrapper">
                <Mail size={18} className="auth-input-icon" />
                <input
                  id="forgot-email"
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

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? 'Sending link...' : 'Send Reset Link'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>
        )}

        <div className="auth-footer">
          Remember your password?{' '}
          <a href="/login" onClick={(e) => { e.preventDefault(); navigateTo('/login'); }}>
            Back to log in
          </a>
        </div>
      </div>
    </div>
  );
}
