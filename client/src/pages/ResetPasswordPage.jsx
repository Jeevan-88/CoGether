import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, Check, X, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { API_URL } from '../config/api.js';
import './AuthStyles.css';

export default function ResetPasswordPage({ onNavigate }) {
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    const emailParam = params.get('email');
    if (tokenParam) setToken(tokenParam);
    if (emailParam) setEmail(emailParam);
  }, []);

  const criteria = {
    length: newPassword.length >= 8,
    hasUpper: /[A-Z]/.test(newPassword),
    hasNumber: /[0-9]/.test(newPassword),
    hasSpecial: /[^A-Za-z0-9]/.test(newPassword)
  };

  const metCount = Object.values(criteria).filter(Boolean).length;
  const isPasswordValid = metCount === 4;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

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

    if (!token) {
      setErrorMessage('Missing password reset token. Please request a new link.');
      return;
    }
    if (!email) {
      setErrorMessage('Missing email associated with token. Please request a new link.');
      return;
    }
    if (!isPasswordValid) {
      setErrorMessage('Please satisfy all password security criteria');
      return;
    }
    if (!passwordsMatch) {
      setErrorMessage('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          email: email.trim().toLowerCase(),
          newPassword
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(data.error?.message || data.message || 'Password reset failed. The link may have expired.');
        return;
      }

      setSuccess(true);
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
          <h1 className="auth-title">Set new password</h1>
          <p className="auth-subtitle">Choose a strong, unique password to secure your CoGether account.</p>
        </div>

        {errorMessage && (
          <div className="auth-alert-error" role="alert" style={{ marginBottom: '20px' }}>
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {success ? (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="auth-alert-success" role="status" style={{ justifyContent: 'center' }}>
              <CheckCircle2 size={20} />
              <span>Password successfully updated!</span>
            </div>
            <p style={{ fontSize: '14px', color: '#9ca3af', margin: '8px 0' }}>
              All existing sessions have been invalidated. You can now log in with your new password.
            </p>
            <button
              type="button"
              className="auth-submit-btn"
              onClick={() => navigateTo('/login')}
              style={{ marginTop: '12px' }}
            >
              Log In Now
              <ArrowRight size={18} />
            </button>
          </div>
        ) : !token ? (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="auth-alert-error" role="alert" style={{ justifyContent: 'center' }}>
              <AlertCircle size={20} />
              <span>No reset token detected in the link</span>
            </div>
            <p style={{ fontSize: '14px', color: '#9ca3af' }}>
              Please click the link directly from your email, or request a fresh reset link.
            </p>
            <button
              type="button"
              className="auth-submit-btn"
              onClick={() => navigateTo('/forgot-password')}
            >
              Request Reset Link
              <ArrowRight size={18} />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="auth-field-group">
              <label className="auth-label" htmlFor="reset-new-password">New Password</label>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-input-icon" />
                <input
                  id="reset-new-password"
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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

              {/* Password criteria */}
              {newPassword.length > 0 && (
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
              <label className="auth-label" htmlFor="reset-confirm-password">Confirm Password</label>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-input-icon" />
                <input
                  id="reset-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="auth-input"
                  placeholder="Confirm new password"
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
              disabled={loading || (newPassword.length > 0 && (!isPasswordValid || !passwordsMatch))}
            >
              {loading ? 'Updating password...' : 'Update Password'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>
        )}

        <div className="auth-footer">
          <a href="/login" onClick={(e) => { e.preventDefault(); navigateTo('/login'); }}>
            Back to log in
          </a>
        </div>
      </div>
    </div>
  );
}
