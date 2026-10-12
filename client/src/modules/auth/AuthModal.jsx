import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mail,
  User,
  KeyRound,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../core/AuthContext.jsx';
import { API_URL } from '../../config/api.js';
import './AuthModal.css';

export default function AuthModal({ onClose, onLoginSuccess }) {
  const { requestOtp, verifyOtp } = useAuth();

  // Mode: 'signup' | 'signin'
  const [mode, setMode] = useState('signup');
  // Step: 'input' (email/name) | 'verify' (6-digit OTP)
  const [step, setStep] = useState('input');

  // Form states
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [otp, setOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Status and feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [socialNotice, setSocialNotice] = useState('');

  const videoRef = useRef(null);
  const otpInputRef = useRef(null);

  // Cooldown timer for OTP resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Ensure video pauses on final logo frame without jarring jump back to start
  const handleVideoEnded = (e) => {
    e.target.pause();
  };

  // Switch between Sign-Up and Sign-In while preserving layout
  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setInfo('');
    setSocialNotice('');
    setStep('input');
    setOtp('');
  };

  // Step 1: Request OTP
  const handleRequestOtpSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setSocialNotice('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    const purpose = mode === 'signup' ? 'signup' : 'login';
    const result = await requestOtp(cleanEmail, purpose);
    setLoading(false);

    if (!result.success) {
      if (result.error === 'EMAIL_SERVICE_NOT_CONFIGURED') {
        setError('Email delivery is not configured on this environment. Please contact support.');
      } else {
        setError(result.message || 'Unable to send passcode. Please try again.');
      }
      if (result.retryAfterSeconds) {
        setResendCooldown(result.retryAfterSeconds);
      }
      return;
    }

    setResendCooldown(60);
    setStep('verify');
    setOtp('');
    setTimeout(() => {
      otpInputRef.current?.focus();
    }, 100);
  };

  // Step 2: Verify OTP
  const executeVerify = async (codeToVerify) => {
    setError('');
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const result = await verifyOtp(cleanEmail, codeToVerify, {
      displayName: displayName.trim() || undefined
    });
    setLoading(false);

    if (!result.success) {
      setError(result.message || "Invalid or expired passcode. Please try again.");
      return;
    }

    if (onLoginSuccess) {
      onLoginSuccess(result.user, result.profile);
    }
    onClose();
  };

  const handleVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter the complete 6-digit code.');
      return;
    }
    executeVerify(otp);
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setError('');
    setInfo('');
    setLoading(true);
    const purpose = mode === 'signup' ? 'signup' : 'login';
    const result = await requestOtp(email.trim().toLowerCase(), purpose);
    setLoading(false);

    if (result.success) {
      setResendCooldown(60);
      setInfo('A new verification code was sent to your inbox.');
      setOtp('');
      setTimeout(() => setInfo(''), 5000);
    } else {
      setError(result.message || 'Could not resend passcode right now.');
      if (result.retryAfterSeconds) setResendCooldown(result.retryAfterSeconds);
    }
  };

  // Google OAuth redirect
  const handleGoogleAuth = () => {
    window.location.href = `${API_URL}/api/v1/auth/google`;
  };

  // Non-functional OAuth feedback for Apple & Telegram
  const showUnsupportedNotice = (providerName) => {
    setSocialNotice(`${providerName} authentication is currently in configuration. Please use Email or Google to continue.`);
    setTimeout(() => setSocialNotice(''), 4500);
  };

  return (
    <div
      className="flow-auth-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="CoGether Authentication"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flow-auth-card">
        {/* Subtle close button in top corner */}
        <button
          type="button"
          className="flow-modal-close-btn"
          onClick={onClose}
          aria-label="Close"
          title="Close modal"
        >
          <X size={18} />
        </button>

        {/* ── LEFT VISUAL PANEL (VIDEO) ── */}
        <div className="flow-auth-left-panel">
          <div className="flow-video-stage">
            <video
              ref={videoRef}
              className="flow-auth-video"
              src="/cogether_auth_video.mp4"
              poster="/cogether-exact-hero.png"
              autoPlay
              muted
              playsInline
              preload="auto"
              onEnded={handleVideoEnded}
            />

            {/* Bottom-left inspirational badge matching reference */}
            <div className="flow-video-leaf-badge">
              <div className="leaf-badge-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
                  <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
                </svg>
              </div>
              <div className="leaf-badge-content">
                <span className="badge-main">Stay focused.</span>
                <span className="badge-sub">Grow every day.</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── CENTER CURVED CUTOUT & PAGINATION INDICATOR ── */}
        <div className="flow-center-seam-bridge" aria-hidden="true">
          <svg
            className="flow-center-curved-svg"
            viewBox="0 0 100 88"
            fill="none"
          >
            <path
              d="M 50,0 
                 C 50,16 12,24 12,44 
                 C 12,64 50,72 50,88 
                 C 50,72 88,64 88,44 
                 C 88,24 50,16 50,0 Z"
              fill="#000000"
            />
            {/* Active white pill */}
            <rect x="32" y="41.5" width="16" height="5" rx="2.5" fill="#ffffff" />
            {/* Dot 2 */}
            <circle cx="56" cy="44" r="2.5" fill="rgba(255, 255, 255, 0.45)" />
            {/* Dot 3 */}
            <circle cx="66" cy="44" r="2.5" fill="rgba(255, 255, 255, 0.25)" />
          </svg>
        </div>

        {/* ── RIGHT SIGNUP / SIGNIN FORM PANEL ── */}
        <div className="flow-auth-right-panel">
          {/* Top-Right Account Switch Link */}
          <div className="flow-top-switch-row">
            {step === 'input' ? (
              mode === 'signup' ? (
                <span>
                  Already have an account?{' '}
                  <button
                    type="button"
                    className="flow-switch-action"
                    onClick={() => switchMode('signin')}
                  >
                    Log In
                  </button>
                </span>
              ) : (
                <span>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    className="flow-switch-action"
                    onClick={() => switchMode('signup')}
                  >
                    Sign Up
                  </button>
                </span>
              )
            ) : (
              <button
                type="button"
                className="flow-switch-action"
                onClick={() => {
                  setStep('input');
                  setError('');
                }}
              >
                ← Back
              </button>
            )}
          </div>

          <div className="flow-form-content">
            {/* Main Header & Subtitle */}
            <div className="flow-header-block">
              {step === 'input' ? (
                <>
                  <h1 className="flow-title">
                    {mode === 'signup' ? 'Build Your Flow' : 'Welcome Back'}
                  </h1>
                  <p className="flow-subtitle">
                    {mode === 'signup'
                      ? 'Create your account and get started with a clear mind'
                      : 'Sign in to your flow and continue where you left off'}
                  </p>
                </>
              ) : (
                <>
                  <h1 className="flow-title">Check Your Inbox</h1>
                  <p className="flow-subtitle">
                    Enter the 6-digit code sent to{' '}
                    <strong className="flow-highlight-email">{email}</strong>
                  </p>
                </>
              )}
            </div>

            {/* Inline Feedback Alerts */}
            {error && (
              <div className="flow-alert-banner alert-error">
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            {info && (
              <div className="flow-alert-banner alert-info">
                <CheckCircle2 size={15} />
                <span>{info}</span>
              </div>
            )}

            {socialNotice && (
              <div className="flow-alert-banner alert-notice">
                <AlertCircle size={15} />
                <span>{socialNotice}</span>
              </div>
            )}

            {/* ── STEP 1: EMAIL & DETAILS FORM ── */}
            {step === 'input' ? (
              <form onSubmit={handleRequestOtpSubmit} className="flow-interactive-form">
                <div className="flow-field-wrapper">
                  <Mail size={18} className="flow-field-icon" />
                  <input
                    type="email"
                    className="flow-input-control"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                    autoFocus
                  />
                </div>

                {mode === 'signup' && (
                  <div className="flow-field-wrapper">
                    <User size={18} className="flow-field-icon" />
                    <input
                      type="text"
                      className="flow-input-control"
                      placeholder="Display Name (Optional)"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      autoComplete="name"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="flow-action-button"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="btn-flex-inner">
                      <Loader2 size={16} className="btn-spinner" />
                      <span>Sending code...</span>
                    </span>
                  ) : (
                    <span className="btn-flex-inner">
                      <span>{mode === 'signup' ? 'Sign Up' : 'Continue'}</span>
                      <ArrowRight size={17} />
                    </span>
                  )}
                </button>
              </form>
            ) : (
              /* ── STEP 2: 6-DIGIT OTP VERIFICATION FORM ── */
              <form onSubmit={handleVerifyOtpSubmit} className="flow-interactive-form">
                <div className="flow-field-wrapper">
                  <KeyRound size={18} className="flow-field-icon" />
                  <input
                    ref={otpInputRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    className="flow-input-control"
                    placeholder="Enter 6-digit passcode"
                    value={otp}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setOtp(clean);
                      if (clean.length === 6) {
                        executeVerify(clean);
                      }
                    }}
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  className="flow-action-button"
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? (
                    <span className="btn-flex-inner">
                      <Loader2 size={16} className="btn-spinner" />
                      <span>Verifying...</span>
                    </span>
                  ) : (
                    <span className="btn-flex-inner">
                      <span>Verify & Enter</span>
                      <ArrowRight size={17} />
                    </span>
                  )}
                </button>

                <div className="flow-otp-meta-row">
                  <button
                    type="button"
                    className="flow-resend-link"
                    disabled={resendCooldown > 0 || loading}
                    onClick={handleResendOtp}
                  >
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
                  </button>
                  <button
                    type="button"
                    className="flow-change-email-link"
                    onClick={() => {
                      setStep('input');
                      setError('');
                    }}
                  >
                    Change email
                  </button>
                </div>
              </form>
            )}

            {/* ── OR CONTINUE WITH DIVIDER ── */}
            <div className="flow-divider-row">
              <div className="divider-hairline" />
              <span className="divider-caption">or continue with</span>
              <div className="divider-hairline" />
            </div>

            {/* ── SOCIAL AUTH ROW (Google, Apple, Telegram) ── */}
            <div className="flow-social-grid">
              {/* Google Button (Real OAuth) */}
              <button
                type="button"
                className="flow-social-card btn-google"
                onClick={handleGoogleAuth}
                title="Continue with Google"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" className="social-svg">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Google</span>
              </button>

              {/* Apple Button (Clean feedback) */}
              <button
                type="button"
                className="flow-social-card btn-apple"
                onClick={() => showUnsupportedNotice('Apple')}
                title="Apple Sign In in configuration"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="#111111" className="social-svg">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.93-2.85-.9.04-1.99.6-2.63 1.35-.56.64-1.05 1.71-.92 2.73 1 .08 2-.48 2.62-1.23"/>
                </svg>
                <span>Apple</span>
              </button>

              {/* Telegram Button (Clean feedback) */}
              <button
                type="button"
                className="flow-social-card btn-telegram"
                onClick={() => showUnsupportedNotice('Telegram')}
                title="Telegram Sign In in configuration"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="#0088cc" className="social-svg">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                </svg>
                <span>Telegram</span>
              </button>
            </div>

            {/* ── BOTTOM LEGAL TEXT ── */}
            <p className="flow-legal-disclaimer">
              By signing up, you agree to our{' '}
              <a href="#terms" onClick={(e) => e.preventDefault()}>
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#privacy" onClick={(e) => e.preventDefault()}>
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
