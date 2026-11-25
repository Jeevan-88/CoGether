import React, { useState, useEffect } from 'react';
import { Sparkles, Check, ArrowRight, Loader2, X, Tv, Gamepad2, ShoppingBag, GraduationCap } from 'lucide-react';
import { useAuth } from '../../core/AuthContext.jsx';
import { API_URL, parseApiResponse, formatNetworkError } from '../../config/api.js';
import { analytics } from '../../core/analytics.js';

const INTEREST_OPTIONS = [
  { id: 'cowatch', label: 'Co-Watch Cinema', desc: 'Watch movies & videos in sync', icon: Tv },
  { id: 'coplay', label: 'Co-Play Arcade', desc: 'Multiplayer games with friends', icon: Gamepad2 },
  { id: 'coshop', label: 'Co-Shop Studio', desc: 'Browse & curate together live', icon: ShoppingBag },
  { id: 'costudy', label: 'Co-Study World', desc: 'Focused co-working & coding rooms', icon: GraduationCap }
];

const AVATAR_ACCENTS = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6'];

export default function OnboardingModal({ isOpen, onComplete, onSelectService }) {
  const { user, profile, accessToken, restoreSession, checkUsername } = useAuth();
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [accent, setAccent] = useState(AVATAR_ACCENTS[0]);
  const [primaryInterest, setPrimaryInterest] = useState('cowatch');
  const [usernameStatus, setUsernameStatus] = useState(''); // '' | 'available' | 'taken' | 'invalid'
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setDisplayName(profile?.displayName || user?.displayName || user?.name || '');
    setUsername(profile?.username || '');
  }, [isOpen, profile, user]);

  useEffect(() => {
    const clean = username.trim().toLowerCase();
    if (!clean || clean === (profile?.username || '').toLowerCase()) {
      setUsernameStatus('');
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(clean)) {
      setUsernameStatus('invalid');
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await checkUsername?.(clean);
        if (res && typeof res.available === 'boolean') {
          setUsernameStatus(res.available ? 'available' : 'taken');
        }
      } catch {
        setUsernameStatus('');
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [username, profile?.username, checkUsername]);

  if (!isOpen) return null;

  const handleFinish = async (launchRoom = false, allowFallbackName = false) => {
    setError('');
    const resolvedDisplayName =
      displayName.trim() ||
      (allowFallbackName ? (user?.email?.split('@')[0] || 'Member') : '');
    if (!resolvedDisplayName) {
      setError('Please enter a display name.');
      return;
    }
    const cleanUser = username.trim().replace(/^@+/, '').toLowerCase();
    if (cleanUser && !/^[a-z0-9_]{3,30}$/.test(cleanUser)) {
      setError('Username must be 3-30 letters, numbers, or underscores.');
      return;
    }

    setSaving(true);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

      const res = await fetch(`${API_URL}/api/v1/auth/onboarding`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          displayName: resolvedDisplayName,
          username: cleanUser || undefined,
          primaryInterest,
          avatarConfig: { ...(profile?.avatarConfig || {}), accent }
        })
      });
      const data = await parseApiResponse(res);
      if (!res.ok || !data.success) {
        setError(data.message || 'Could not save onboarding profile.');
        setSaving(false);
        return;
      }

      analytics.trackEvent('onboarding_completed', { primaryInterest });
      await restoreSession?.().catch(() => {});
      onComplete?.();
      if (launchRoom && onSelectService) {
        onSelectService(primaryInterest);
      }
    } catch (err) {
      setError(formatNetworkError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1200,
      background: 'rgba(6, 7, 11, 0.82)', backdropFilter: 'blur(14px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
    }}>
      <div style={{
        width: '100%', maxWidth: '500px', background: '#111319',
        border: '1px solid rgba(255,255,255,0.12)', borderRadius: '24px',
        padding: '32px', color: '#f3f4f6', position: 'relative',
        boxShadow: '0 24px 60px rgba(0,0,0,0.65)'
      }}>
        <button
          type="button"
          onClick={() => handleFinish(false, true)}
          aria-label="Skip onboarding"
          style={{
            position: 'absolute', top: '18px', right: '18px', background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%',
            width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#9ca3af', cursor: 'pointer'
          }}
        >
          <X size={16} />
        </button>

        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
          {[1, 2, 3].map((s) => (
            <div key={s} style={{
              flex: 1, height: '4px', borderRadius: '999px',
              background: s <= step ? '#10b981' : 'rgba(255,255,255,0.1)'
            }} />
          ))}
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#34d399', fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>
          <Sparkles size={14} />
          <span>STEP {step} OF 3 • WELCOME TO COGETHER</span>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)',
            color: '#fca5a5', padding: '10px 12px', borderRadius: '10px', fontSize: '13px', marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800 }}>Set up your Inner Circle identity</h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af' }}>
              Your name and @handle appear across Co-Watch, Co-Play, Co-Shop, and Co-Study rooms.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%', background: accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', fontWeight: 800, color: '#fff', flexShrink: 0
              }}>
                {(displayName || 'M')[0].toUpperCase()}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {AVATAR_ACCENTS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setAccent(c)}
                    style={{
                      width: '24px', height: '24px', borderRadius: '50%', background: c,
                      border: accent === c ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer'
                    }}
                    aria-label={`Select accent ${c}`}
                  />
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#d1d5db', fontWeight: 600, marginBottom: '6px' }}>
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                style={{
                  width: '100%', height: '44px', borderRadius: '10px', padding: '0 14px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                  color: '#fff', fontSize: '14px', boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#d1d5db', fontWeight: 600, marginBottom: '6px' }}>
                <span>@Username</span>
                {usernameStatus === 'available' && <span style={{ color: '#34d399' }}>Available</span>}
                {usernameStatus === 'taken' && <span style={{ color: '#f87171' }}>Already taken</span>}
                {usernameStatus === 'invalid' && <span style={{ color: '#fbbf24' }}>3-20 a-z, 0-9, _</span>}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="yourhandle"
                style={{
                  width: '100%', height: '44px', borderRadius: '10px', padding: '0 14px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                  color: '#fff', fontSize: '14px', boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="button"
              disabled={usernameStatus === 'taken' || usernameStatus === 'invalid'}
              onClick={() => setStep(2)}
              style={{
                height: '46px', borderRadius: '12px', background: '#10b981', border: 'none',
                color: '#052e16', fontWeight: 800, fontSize: '14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              <span>Continue</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800 }}>What brings you to CoGether?</h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af' }}>
              Pick your favorite shared space so we can personalize your launch hub.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {INTEREST_OPTIONS.map((item) => {
                const Icon = item.icon;
                const active = primaryInterest === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPrimaryInterest(item.id)}
                    style={{
                      padding: '14px', borderRadius: '14px', textAlign: 'left', cursor: 'pointer',
                      background: active ? 'rgba(16,185,129,0.14)' : 'rgba(255,255,255,0.04)',
                      border: active ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                      color: '#fff', display: 'flex', flexDirection: 'column', gap: '6px'
                    }}
                  >
                    <Icon size={20} style={{ color: active ? '#34d399' : '#9ca3af' }} />
                    <span style={{ fontWeight: 700, fontSize: '13px' }}>{item.label}</span>
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>{item.desc}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  flex: 1, height: '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.08)',
                  border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer'
                }}
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                style={{
                  flex: 2, height: '44px', borderRadius: '12px', background: '#10b981',
                  border: 'none', color: '#052e16', fontWeight: 800, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                <span>Next</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16,185,129,0.15)',
              color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto'
            }}>
              <Check size={28} />
            </div>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800 }}>Your room is ready, {displayName}!</h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af' }}>
              Save your setup to sync across devices and start inviting friends into real-time shared rooms.
            </p>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleFinish(true)}
              style={{
                height: '48px', borderRadius: '12px', background: '#10b981',
                border: 'none', color: '#052e16', fontWeight: 800, fontSize: '14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              {saving ? <Loader2 size={18} className="spin" /> : <><span>Save & Launch {INTEREST_OPTIONS.find((i) => i.id === primaryInterest)?.label}</span><ArrowRight size={16} /></>}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleFinish(false)}
              style={{
                height: '42px', borderRadius: '12px', background: 'rgba(255,255,255,0.07)',
                border: 'none', color: '#d1d5db', fontWeight: 600, fontSize: '13px', cursor: 'pointer'
              }}
            >
              Save & Go Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
