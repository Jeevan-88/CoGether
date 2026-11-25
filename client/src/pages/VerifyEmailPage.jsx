import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Loader2, Mail, ArrowRight } from 'lucide-react';
import { API_URL, parseApiResponse, formatNetworkError } from '../config/api.js';
import { useAuth } from '../core/AuthContext.jsx';
import './AuthStyles.css';

export default function VerifyEmailPage({ onNavigate }) {
  const { restoreSession, isAuthenticated } = useAuth();
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('Verifying your email address...');
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendFeedback, setResendFeedback] = useState('');

  const navigateTo = (path) => {
    if (onNavigate) onNavigate(path);
    else window.location.href = path;
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token') || '';
    const email = params.get('email') || '';
    if (email) setResendEmail(email);

    if (!token || !email) {
      setStatus('error');
      setMessage('Verification link is incomplete or missing required parameters.');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/auth/verify-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, token })
        });
        const data = await parseApiResponse(res);
        if (cancelled) return;
        if (res.ok && data.success) {
          setStatus('success');
          setMessage(data.message || 'Email verified successfully!');
          restoreSession?.().catch(() => {});
        } else {
          setStatus('error');
          setMessage(data.message || 'Verification failed or link has expired.');
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setMessage(formatNetworkError(err));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [restoreSession]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;
    setResending(true);
    setResendFeedback('');
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail.trim().toLowerCase() })
      });
      const data = await parseApiResponse(res);
      setResendFeedback(
        data.message || (res.ok ? 'Verification link sent!' : 'Could not resend verification email.')
      );
    } catch (err) {
      setResendFeedback(formatNetworkError(err));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card-container" style={{ textAlign: 'center' }}>
        <div className="auth-header">
          <a href="/" onClick={(e) => { e.preventDefault(); navigateTo('/'); }} className="auth-brand-logo">
            Co<span>Gether</span>
          </a>
          <h1 className="auth-title">Email Verification</h1>
        </div>

        {status === 'verifying' && (
          <div style={{ padding: '24px 0', color: '#9ca3af', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <Loader2 size={32} className="spin" style={{ color: '#10b981' }} />
            <p style={{ margin: 0 }}>{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
            <div className="auth-alert-success" style={{ width: '100%', boxSizing: 'border-box', justifyContent: 'center' }}>
              <CheckCircle2 size={18} />
              <span>{message}</span>
            </div>
            <button
              type="button"
              className="auth-submit-btn"
              onClick={() => navigateTo(isAuthenticated ? '/dashboard' : '/login')}
            >
              <span>{isAuthenticated ? 'Continue to Dashboard' : 'Sign In to CoGether'}</span>
              <ArrowRight size={17} />
            </button>
          </div>
        )}

        {status === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div className="auth-alert-error" role="alert">
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span style={{ textAlign: 'left' }}>{message}</span>
            </div>

            <form onSubmit={handleResend} className="auth-form" style={{ textAlign: 'left' }}>
              <div className="auth-field-group">
                <label className="auth-label" htmlFor="resend-verify-email">Request a fresh verification link</label>
                <div className="auth-input-wrapper">
                  <Mail size={17} className="auth-input-icon" />
                  <input
                    id="resend-verify-email"
                    type="email"
                    className="auth-input"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                  />
                </div>
              </div>
              {resendFeedback && (
                <div className="auth-alert-success" style={{ fontSize: '12px' }}>
                  <span>{resendFeedback}</span>
                </div>
              )}
              <button type="submit" className="auth-submit-btn" disabled={resending}>
                {resending ? <Loader2 size={17} className="spin" /> : 'Resend Verification Email'}
              </button>
            </form>
          </div>
        )}

        <div className="auth-footer">
          <a href="/" onClick={(e) => { e.preventDefault(); navigateTo('/'); }}>Back to Home</a>
        </div>
      </div>
    </div>
  );
}
