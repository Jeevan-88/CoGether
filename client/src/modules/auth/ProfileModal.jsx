import React, { useState } from 'react';
import { X, User, Sparkles, Clock, Shield, LogOut, CheckCircle, AlertCircle, CreditCard, Palette } from 'lucide-react';
import { useAuth } from '../../core/AuthContext.jsx';
import CogetherAvatarRenderer, { DEFAULT_AVATAR_CONFIG } from './CogetherAvatarRenderer.jsx';
import CogetherAvatarStudio from './CogetherAvatarStudio.jsx';
import CogetherMemberCard from './CogetherMemberCard.jsx';
import './ProfileModal.css';
import './AuthModal.css';

export default function ProfileModal({ onClose }) {
  const { user, profile, preferences, updateProfile, updatePreferences, logout } = useAuth();

  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'avatar' | 'card'
  const [firstName, setFirstName] = useState(profile?.firstName || profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.lastName || profile?.last_name || '');
  const [displayName, setDisplayName] = useState(
    profile?.displayName || profile?.display_name || [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || ''
  );
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatarConfig, setAvatarConfig] = useState(
    profile?.avatarConfig || profile?.avatar_config || DEFAULT_AVATAR_CONFIG
  );
  const [primaryInterest, setPrimaryInterest] = useState(preferences?.primaryInterest || 'all');
  const [timezone, setTimezone] = useState(preferences?.timezone || 'UTC');

  const [statusMessage, setStatusMessage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    const computedDisplay = displayName.trim() || [firstName.trim(), lastName.trim()].filter(Boolean).join(' ') || username;

    const profileRes = await updateProfile({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      displayName: computedDisplay,
      username: username.trim().toLowerCase(),
      bio,
      avatarConfig
    });

    if (!profileRes.success) {
      setIsSaving(false);
      setStatusMessage({ type: 'error', text: profileRes.message || profileRes.error || 'Failed to update profile' });
      return;
    }

    const prefRes = await updatePreferences({
      primaryInterest,
      timezone
    });

    setIsSaving(false);
    if (!prefRes.success) {
      setStatusMessage({ type: 'error', text: 'Failed to update preferences' });
    } else {
      setStatusMessage({ type: 'success', text: 'Profile, avatar & preferences saved to PostgreSQL!' });
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  return (
    <div className="modal-overlay fade-in">
      <div className="auth-id-card profile-modal-card" style={{ maxWidth: '620px', maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto' }}>
        <div className="id-card-lanyard-slot" />

        <button className="modal-close" onClick={onClose} aria-label="Close modal">
          <X size={18} />
        </button>

        <div className="auth-header" style={{ marginBottom: '14px' }}>
          <div className="id-card-top-tag">
            <Shield size={12} />
            <span>AUTHENTICATED MEMBER PASS // COGETHER IDENTITY</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '8px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255,255,255,0.16)' }}>
              <CogetherAvatarRenderer config={avatarConfig} size={52} animated={false} />
            </div>
            <div>
              <h2 style={{ margin: 0 }}>{displayName || 'CoGether Member'}</h2>
              <p style={{ fontFamily: 'monospace', fontSize: '12px', color: '#94a3b8', margin: '2px 0 0' }}>
                @{username || 'member'} · {user?.email}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '9px 12px',
              borderRadius: '10px',
              border: activeTab === 'details' ? '1px solid #FFE500' : '1px solid rgba(255,255,255,0.12)',
              background: activeTab === 'details' ? 'rgba(255, 229, 0, 0.14)' : 'rgba(255,255,255,0.04)',
              color: activeTab === 'details' ? '#FFE500' : '#cbd5e1',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <User size={14} /> Profile Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('avatar')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '9px 12px',
              borderRadius: '10px',
              border: activeTab === 'avatar' ? '1px solid #FFE500' : '1px solid rgba(255,255,255,0.12)',
              background: activeTab === 'avatar' ? 'rgba(255, 229, 0, 0.14)' : 'rgba(255,255,255,0.04)',
              color: activeTab === 'avatar' ? '#FFE500' : '#cbd5e1',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Palette size={14} /> Avatar Studio
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('card')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '9px 12px',
              borderRadius: '10px',
              border: activeTab === 'card' ? '1px solid #FFE500' : '1px solid rgba(255,255,255,0.12)',
              background: activeTab === 'card' ? 'rgba(255, 229, 0, 0.14)' : 'rgba(255,255,255,0.04)',
              color: activeTab === 'card' ? '#FFE500' : '#cbd5e1',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <CreditCard size={14} /> Member Card
          </button>
        </div>

        {statusMessage && (
          <div className={statusMessage.type === 'success' ? 'auth-success-banner' : 'auth-error-banner'} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderRadius: '8px',
            marginBottom: '14px',
            fontSize: '13px',
            background: statusMessage.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${statusMessage.type === 'success' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            color: statusMessage.type === 'success' ? '#4ade80' : '#f87171'
          }}>
            {statusMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {activeTab === 'details' && (
          <form onSubmit={handleSave} className="auth-form" style={{ gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="auth-input-field">
                <label>FIRST NAME</label>
                <div className="input-with-icon">
                  <User size={15} />
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      if (!displayName || displayName === `${firstName} ${lastName}`.trim()) {
                        setDisplayName(`${e.target.value} ${lastName}`.trim());
                      }
                    }}
                    placeholder="First name"
                  />
                </div>
              </div>
              <div className="auth-input-field">
                <label>LAST NAME</label>
                <div className="input-with-icon">
                  <User size={15} />
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      if (!displayName || displayName === `${firstName} ${lastName}`.trim()) {
                        setDisplayName(`${firstName} ${e.target.value}`.trim());
                      }
                    }}
                    placeholder="Last name"
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="auth-input-field">
                <label>DISPLAY NAME</label>
                <div className="input-with-icon">
                  <User size={16} />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Alex Rivera"
                    required
                  />
                </div>
              </div>

              <div className="auth-input-field">
                <label>UNIQUE HANDLE</label>
                <div className="input-with-icon">
                  <span style={{ fontSize: '14px', color: '#64748b' }}>@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))}
                    placeholder="alex_rivera"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="auth-input-field">
              <label>BIO / SQUAD MOTTO</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Cinema enthusiast, Retro arcade champion..."
                rows={2}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '13px',
                  resize: 'none'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="auth-input-field">
                <label>PRIMARY INTEREST</label>
                <div className="input-with-icon">
                  <Sparkles size={16} />
                  <select
                    value={primaryInterest}
                    onChange={(e) => setPrimaryInterest(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      color: '#fff',
                      padding: '10px 0',
                      outline: 'none',
                      fontSize: '13px'
                    }}
                  >
                    <option value="all" style={{ background: '#18181b' }}>All Modules</option>
                    <option value="coplay" style={{ background: '#18181b' }}>CoPlay (Arcade & Games)</option>
                    <option value="cowatch" style={{ background: '#18181b' }}>CoWatch (Cinema & OTT)</option>
                    <option value="coshop" style={{ background: '#18181b' }}>CoShop (Social Shopping)</option>
                    <option value="costudy" style={{ background: '#18181b' }}>CoStudy (Focus in Flow)</option>
                  </select>
                </div>
              </div>

              <div className="auth-input-field">
                <label>TIMEZONE</label>
                <div className="input-with-icon">
                  <Clock size={16} />
                  <input
                    type="text"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    placeholder="UTC"
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button type="submit" className="auth-submit-btn" disabled={isSaving} style={{ flex: 1 }}>
                {isSaving ? 'Saving to Database...' : 'Save Profile Changes'}
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="auth-logout-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '0 16px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  color: '#f87171',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          </form>
        )}

        {activeTab === 'avatar' && (
          <div style={{ background: 'linear-gradient(155deg, #f6ebe1 0%, #edd5c5 100%)', padding: '14px', borderRadius: '16px', color: '#141414' }}>
            <CogetherAvatarStudio value={avatarConfig} onChange={setAvatarConfig} />
            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flow-action-button"
                style={{ flex: 1, marginTop: 0 }}
              >
                <span>{isSaving ? 'Saving Avatar...' : 'Save Avatar to Profile'}</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'card' && (
          <div style={{ background: '#050507', padding: '20px 16px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <CogetherMemberCard
              mode="profile"
              user={{ ...user, emailVerified: true }}
              profile={{
                ...profile,
                firstName,
                lastName,
                displayName: displayName || [firstName, lastName].filter(Boolean).join(' ') || 'CoGether Member',
                username: username || 'member',
                avatarConfig
              }}
              avatarConfig={avatarConfig}
              onEnterCogether={onClose}
              onEditProfile={() => setActiveTab('details')}
            />
          </div>
        )}
      </div>
    </div>
  );
}
