import React, { useState } from 'react';
import { X, User, Sparkles, Globe, Clock, Shield, LogOut, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../core/AuthContext.jsx';
import './ProfileModal.css';

export default function ProfileModal({ onClose }) {
  const { user, profile, preferences, entitlement, updateProfile, updatePreferences, uploadAvatar, logout } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.displayName || profile?.display_name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl || profile?.avatar_url || '');
  const [primaryInterest, setPrimaryInterest] = useState(preferences?.primaryInterest || 'all');
  const [timezone, setTimezone] = useState(preferences?.timezone || 'UTC');

  const [statusMessage, setStatusMessage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setStatusMessage({ type: 'error', text: 'Image file exceeds maximum 5MB size limit' });
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result;
      setIsSaving(true);
      setStatusMessage(null);
      const res = await uploadAvatar(base64, file.type);
      setIsSaving(false);
      if (res.success) {
        setAvatarUrl(res.avatarUrl);
        setStatusMessage({ type: 'success', text: 'Avatar uploaded and saved to PostgreSQL profile!' });
        setTimeout(() => setStatusMessage(null), 3000);
      } else {
        setStatusMessage({ type: 'error', text: res.message || res.error || 'Avatar upload failed' });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    const profileRes = await updateProfile({
      displayName,
      username,
      bio,
      avatarUrl
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
      setStatusMessage({ type: 'success', text: 'Profile & preferences saved to PostgreSQL!' });
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  return (
    <div className="modal-overlay fade-in">
      <div className="auth-id-card profile-modal-card" style={{ maxWidth: '580px' }}>
        <div className="id-card-lanyard-slot" />

        <button className="modal-close" onClick={onClose} aria-label="Close modal">
          <X size={18} />
        </button>

        <div className="auth-header">
          <div className="id-card-top-tag">
            <Shield size={12} />
            <span>AUTHENTICATED MEMBER PASS // IDENTITY CLUSTER</span>
          </div>
          <h2>Member Profile & Preferences</h2>
          <p style={{ fontFamily: 'monospace', fontSize: '11px', color: '#94a3b8' }}>
            USER ID: {user?.id}
          </p>
        </div>

        {statusMessage && (
          <div className={statusMessage.type === 'success' ? 'auth-success-banner' : 'auth-error-banner'} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '13px',
            background: statusMessage.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${statusMessage.type === 'success' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            color: statusMessage.type === 'success' ? '#4ade80' : '#f87171'
          }}>
            {statusMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="auth-form" style={{ gap: '14px' }}>
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
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="alex_rivera"
                  required
                />
              </div>
            </div>
          </div>

          <div className="auth-input-field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ margin: 0 }}>AVATAR IMAGE</label>
              <label
                style={{
                  fontSize: '11px',
                  color: '#FFE500',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Upload File (Max 5MB)
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://... or click Upload File above"
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '13px'
              }}
            />
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
                  <option value="costudy" style={{ background: '#18181b' }}>Duo Camera (Telepresence)</option>
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

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
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
      </div>
    </div>
  );
}
