import React, { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff, Check, X, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { API_URL, parseApiResponse, formatNetworkError } from '../config/api.js';
import { analytics } from '../core/analytics.js';
import './AuthStyles.css';

export default function SignupPage({ onNavigate }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Password criteria verification
  const criteria = {
    length: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password)
  };

  const metCount = Object.values(criteria).filter(Boolean).length;
  const isPasswordValid = metCount === 4;
  const passwordsMatch = password.length > 0 && password === confirmPassword;

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

    if (!name.trim()) {
      setErrorMessage('Please enter your full name');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMessage('Please enter a valid email address');
      return;
    }
    if (!isPasswordValid) {
      setErrorMessage('Please satisfy all password security requirements');
      return;
    }
    if (!passwordsMatch) {
      setErrorMessage('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/v1/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password
        })
      });

      const data = await parseApiResponse(response);

      if (!response.ok || !data.success) {
        setErrorMessage(data.error?.message || data.message || 'Signup failed. Please try again.');
        return;
      }

      analytics.trackEvent('signup_completed', { verificationEmailSent: Boolean(data.verificationEmailSent) });
      setSuccessMessage(
        data.message ||
          'Account created successfully! Check your email for your verification link.'
      );
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
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
          <h1 className="auth-title">Create your account</h1>
          <p className="auth-subtitle">Join CoGether to watch, play, shop, and study together in real-time.</p>
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
            <label className="auth-label" htmlFor="signup-name">Full Name</label>
            <div className="auth-input-wrapper">
              <User size={18} className="auth-input-icon" />
              <input
                id="signup-name"
                type="text"
                className="auth-input"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
          </div>

          <div className="auth-field-group">
            <label className="auth-label" htmlFor="signup-email">Email Address</label>
            <div className="auth-input-wrapper">
              <Mail size={18} className="auth-input-icon" />
              <input
                id="signup-email"
                type="email"
                className="auth-input"
                placeholder="jane@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="auth-field-group">
            <label className="auth-label" htmlFor="signup-password">Password</label>
            <div className="auth-input-wrapper">
              <Lock size={18} className="auth-input-icon" />
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
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

            {/* Live Criteria Feedback */}
            {password.length > 0 && (
              <div className="pwd-strength-container">
                <div className="pwd-strength-bars">
                  <div className={`pwd-bar ${metCount >= 1 ? (metCount <= 2 ? 'is-weak' : metCount === 3 ? 'is-medium' : 'is-strong') : ''}`} />
                  <div className={`pwd-bar ${metCount >= 2 ? (metCount <= 2 ? 'is-weak' : metCount === 3 ? 'is-medium' : 'is-strong') : ''}`} />
                  <div className={`pwd-bar ${metCount >= 3 ? (metCount === 3 ? 'is-medium' : 'is-strong') : ''}`} />
                  <div className={`pwd-bar ${metCount === 4 ? 'is-strong' : ''}`} />
                </div>
                <div className="pwd-criteria-list">
                  <span className={`pwd-criteria-item ${criteria.length ? 'is-met' : ''}`}>
                    {criteria.length ? <Check size={13} /> : <X size={13} />} 8+ characters
                  </span>
                  <span className={`pwd-criteria-item ${criteria.hasUpper ? 'is-met' : ''}`}>
                    {criteria.hasUpper ? <Check size={13} /> : <X size={13} />} 1 uppercase letter
                  </span>
                  <span className={`pwd-criteria-item ${criteria.hasNumber ? 'is-met' : ''}`}>
                    {criteria.hasNumber ? <Check size={13} /> : <X size={13} />} 1 number
                  </span>
                  <span className={`pwd-criteria-item ${criteria.hasSpecial ? 'is-met' : ''}`}>
                    {criteria.hasSpecial ? <Check size={13} /> : <X size={13} />} 1 symbol
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="auth-field-group">
            <label className="auth-label" htmlFor="signup-confirm-password">Confirm Password</label>
            <div className="auth-input-wrapper">
              <Lock size={18} className="auth-input-icon" />
              <input
                id="signup-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                className="auth-input"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="auth-toggle-pwd"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {confirmPassword.length > 0 && (
              <span style={{ fontSize: '12px', marginTop: '4px', color: passwordsMatch ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {passwordsMatch ? <Check size={14} /> : <X size={14} />}
                {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading || (password.length > 0 && (!isPasswordValid || !passwordsMatch))}
          >
            {loading ? 'Creating account...' : 'Create Account'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <a href="/login" onClick={(e) => { e.preventDefault(); navigateTo('/login'); }}>
            Log in
          </a>
        </div>
      </div>
    </div>
  );
}
