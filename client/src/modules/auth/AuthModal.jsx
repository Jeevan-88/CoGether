import React, { useState, useEffect } from 'react';
import { X, Mail, User, Shield, ArrowRight, CheckCircle2, RotateCw } from 'lucide-react';
import { useAuth } from '../../core/AuthContext.jsx';
import { API_URL } from '../../config/api.js';
import './AuthModal.css';

export default function AuthModal({ onClose, onLoginSuccess }) {
  const { requestOtp, verifyOtp } = useAuth();

  // State: 'email' (step 1) | 'otp' (step 2)
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Step 1: Send OTP to email
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    const result = await requestOtp(cleanEmail, 'signup');
    setLoading(false);

    if (!result.success) {
      setError(result.message || 'Failed to dispatch verification passcode.');
      if (result.retryAfterSeconds) {
        setResendCooldown(result.retryAfterSeconds);
      }
      return;
    }

    setStep('otp');
    setResendCooldown(60);
    setInfoMessage(`A 6-digit passcode has been sent to ${cleanEmail}`);
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');

    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6) {
      setError('Please enter the full 6-digit passcode.');
      return;
    }

    setLoading(true);
    const result = await verifyOtp(email, cleanOtp, {
      displayName: displayName.trim() || undefined,
      username: username.trim() || undefined
    });
    setLoading(false);

    if (!result.success) {
      setError(result.message || 'Invalid passcode. Please try again.');
      return;
    }

    if (onLoginSuccess) {
      onLoginSuccess(result.user, result.profile);
    }
    onClose();
  };

  // Resend code handler
  const handleResend = async () => {
    if (resendCooldown > 0 || loading) return;
    setError('');
    setLoading(true);
    const result = await requestOtp(email, 'signup');
    setLoading(false);

    if (result.success) {
      setResendCooldown(60);
      setInfoMessage('A fresh passcode has been dispatched.');
    } else {
      setError(result.message || 'Failed to resend passcode.');
      if (result.retryAfterSeconds) {
        setResendCooldown(result.retryAfterSeconds);
      }
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/api/v1/auth/google`;
  };

  return (
    <div className="modal-overlay fade-in">
      <div className="auth-id-card">
        <div className="id-card-lanyard-slot" />

        <button className="modal-close" onClick={onClose} aria-label="Close modal">
          <X size={18} />
        </button>

        <div className="auth-header">
          <div className="id-card-top-tag">
            <Shield size={12} />
            <span>AUTHENTICATED MEMBER PASS // IDENTITY CLUSTER</span>
          </div>
          <h2>{step === 'email' ? 'Enter CoGether' : 'Enter Passcode'}</h2>
          <p>
            {step === 'email'
              ? 'Passwordless single-sign-on backed by real PostgreSQL identity.'
              : `Enter the 6-digit security passcode sent to ${email}.`}
          </p>
        </div>

        {error && <div className="auth-error-banner">{error}</div>}
        {infoMessage && (
          <div className="auth-info-banner" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(59, 130, 246, 0.12)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            color: '#60a5fa',
            padding: '10px 14px',
            borderRadius: '6px',
            fontSize: '13px',
            marginBottom: '16px'
          }}>
            <CheckCircle2 size={16} />
            <span>{infoMessage}</span>
          </div>
        )}

        {step === 'email' ? (
          <form onSubmit={handleRequestOtp} className="auth-form">
            <div className="auth-input-field">
              <label>EMAIL ADDRESS</label>
              <div className="input-with-icon">
                <Mail size={16} />
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="auth-input-field">
                <label>DISPLAY NAME (OPTIONAL)</label>
                <div className="input-with-icon">
                  <User size={16} />
                  <input
                    type="text"
                    placeholder="Alex Rivera"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
              </div>

              <div className="auth-input-field">
                <label>HANDLE (OPTIONAL)</label>
                <div className="input-with-icon">
                  <span style={{ fontSize: '14px', color: '#64748b' }}>@</span>
                  <input
                    type="text"
                    placeholder="alex_rivera"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? 'Dispatching Passcode...' : 'Send Single-Use Passcode'} <ArrowRight size={16} />
            </button>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              margin: '14px 0',
              color: '#475569',
              fontSize: '12px'
            }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
              <span style={{ padding: '0 10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Or Federate</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
            </div>

            <button
              type="button"
              className="google-oauth-btn"
              onClick={handleGoogleLogin}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                width: '100%',
                padding: '12px',
                background: '#ffffff',
                color: '#18181b',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Continue with Google (OIDC)
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="auth-form">
            <div className="auth-input-field">
              <label>6-DIGIT SECURITY PASSCODE</label>
              <div className="input-with-icon">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  autoComplete="one-time-code"
                  autoFocus
                  required
                  style={{
                    letterSpacing: '8px',
                    fontSize: '24px',
                    fontWeight: '700',
                    textAlign: 'center',
                    fontFamily: 'monospace'
                  }}
                />
              </div>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? 'Verifying Passcode...' : 'Verify & Sign In'} <ArrowRight size={16} />
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
              <button
                type="button"
                className="text-btn"
                onClick={() => { setStep('email'); setOtp(''); setError(''); }}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '12px' }}
              >
                Change Email
              </button>

              <button
                type="button"
                className="text-btn"
                onClick={handleResend}
                disabled={resendCooldown > 0 || loading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: resendCooldown > 0 ? '#475569' : '#FFE500',
                  cursor: resendCooldown > 0 ? 'default' : 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <RotateCw size={12} />
                {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : 'Resend Code'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
