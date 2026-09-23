import React, { useState } from 'react';
import { X, Users, Shield, Play, Link2, AlertCircle, Sparkles } from 'lucide-react';

export default function CreateRoomModal({
  isOpen,
  mode = 'CREATE', // 'CREATE' | 'JOIN' | 'IMPORT'
  initialContent,
  onClose,
  onSubmitCreate,
  onSubmitJoin,
  onSubmitImport
}) {
  const [activeTab, setActiveTab] = useState(mode);
  const [joinCode, setJoinCode] = useState('');
  const [partyTitle, setPartyTitle] = useState(initialContent ? `${initialContent.title} Watch Party` : 'CoWatch Party');
  const [controlPolicy, setControlPolicy] = useState('HOST_ONLY'); // 'HOST_ONLY' | 'EVERYONE'
  
  // Safe Import fields
  const [importUrl, setImportUrl] = useState('');
  const [importTitle, setImportTitle] = useState('');
  const [importError, setImportError] = useState('');

  React.useEffect(() => {
    setActiveTab(mode);
    setImportError('');
  }, [mode, isOpen]);

  if (!isOpen) return null;

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    onSubmitJoin(joinCode.trim().toUpperCase());
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    onSubmitCreate({
      title: partyTitle.trim() || 'CoWatch Party',
      contentId: initialContent?.id || null,
      controlPolicy,
      playbackMode: initialContent?.playbackMode || 'NATIVE_PLAYER'
    });
  };

  const handleImportSubmit = (e) => {
    e.preventDefault();
    setImportError('');
    const raw = importUrl.trim();
    if (!raw) return;

    // 1. YouTube Validation
    const ytMatch = raw.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/|shorts\/))([\w-]{11})/);
    if (ytMatch && ytMatch[1]) {
      const ytId = ytMatch[1];
      onSubmitImport({
        id: `yt-custom-${ytId}`,
        title: importTitle.trim() || 'Imported YouTube Stream',
        description: 'Verified YouTube synchronized stream.',
        thumbnail: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
        backdrop: `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`,
        contentType: 'YOUTUBE_VIDEO',
        genre: 'Online Video',
        year: new Date().getFullYear(),
        providerId: 'youtube',
        providerName: 'YouTube',
        sourceType: 'YOUTUBE',
        playbackMode: 'YOUTUBE_PLAYER',
        licenseStatus: 'LICENSE_VERIFIED',
        videoStreamUrl: ytId,
        externalUrl: `https://www.youtube.com/watch?v=${ytId}`
      });
      return;
    }

    // 2. Direct Video File Validation (.mp4, .webm, .m3u8)
    if (raw.match(/\.(mp4|webm|m3u8)(\?.*)?$/i)) {
      onSubmitImport({
        id: `direct-${Date.now()}`,
        title: importTitle.trim() || 'Direct Video Stream',
        description: 'Direct in-app media playback.',
        thumbnail: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80',
        backdrop: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1920&q=80',
        contentType: 'MOVIE',
        genre: 'Direct Media',
        year: new Date().getFullYear(),
        providerId: 'cogether_hosted',
        providerName: 'Direct Video Stream',
        sourceType: 'OPEN_LICENSE',
        playbackMode: 'NATIVE_PLAYER',
        licenseStatus: 'OPEN_LICENSE_VERIFIED',
        videoStreamUrl: raw,
        externalUrl: raw
      });
      return;
    }

    // Reject arbitrary websites to prevent SSRF and insecure iframe proxying
    setImportError('For security and compliance, only official YouTube links and direct media files (.mp4, .webm, .m3u8) can be imported. Arbitrary websites cannot be proxied.');
  };

  return (
    <div className="cowatch-modal-backdrop" onClick={onClose}>
      <div className="cowatch-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cowatch-modal-header">
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className={`cowatch-filter-tab ${activeTab === 'CREATE' ? 'active' : ''}`}
              onClick={() => setActiveTab('CREATE')}
            >
              Start Party
            </button>
            <button
              type="button"
              className={`cowatch-filter-tab ${activeTab === 'JOIN' ? 'active' : ''}`}
              onClick={() => setActiveTab('JOIN')}
            >
              Join Room
            </button>
            <button
              type="button"
              className={`cowatch-filter-tab ${activeTab === 'IMPORT' ? 'active' : ''}`}
              onClick={() => setActiveTab('IMPORT')}
            >
              Import URL
            </button>
          </div>
          <button type="button" className="btn-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tab 1: Create Room */}
        {activeTab === 'CREATE' && (
          <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {initialContent && (
              <div style={{
                display: 'flex',
                gap: '12px',
                padding: '12px',
                background: 'var(--cw-bg-surface)',
                borderRadius: 'var(--cw-radius-md)',
                border: '1px solid var(--cw-border-subtle)'
              }}>
                <img
                  src={initialContent.thumbnail}
                  alt={initialContent.title}
                  style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                />
                <div>
                  <h4 style={{ margin: 0, fontSize: '13px', color: '#fff' }}>{initialContent.title}</h4>
                  <span style={{ fontSize: '11px', color: 'var(--cw-gold-primary)' }}>
                    Mode: {initialContent.playbackMode}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--cw-text-muted)', fontWeight: 700 }}>
                Party Title
              </label>
              <input
                type="text"
                value={partyTitle}
                onChange={(e) => setPartyTitle(e.target.value)}
                placeholder="Give your cinema party a name..."
                style={{
                  width: '100%',
                  marginTop: '6px',
                  padding: '10px 14px',
                  background: 'var(--cw-bg-surface)',
                  border: '1px solid var(--cw-border-subtle)',
                  borderRadius: 'var(--cw-radius-md)',
                  color: '#fff',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--cw-text-muted)', fontWeight: 700 }}>
                Playback Permissions
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  className={`cowatch-filter-tab ${controlPolicy === 'HOST_ONLY' ? 'active' : ''}`}
                  onClick={() => setControlPolicy('HOST_ONLY')}
                  style={{ textAlign: 'center', padding: '10px' }}
                >
                  <Shield size={14} style={{ display: 'inline', marginRight: '6px' }} />
                  Host Only
                </button>
                <button
                  type="button"
                  className={`cowatch-filter-tab ${controlPolicy === 'EVERYONE' ? 'active' : ''}`}
                  onClick={() => setControlPolicy('EVERYONE')}
                  style={{ textAlign: 'center', padding: '10px' }}
                >
                  <Users size={14} style={{ display: 'inline', marginRight: '6px' }} />
                  Everyone
                </button>
              </div>
            </div>

            <button type="submit" className="btn-hero-watch-now" style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}>
              <Play size={16} fill="#060608" />
              <span>Launch Cinema Room</span>
            </button>
          </form>
        )}

        {/* Tab 2: Join Room */}
        {activeTab === 'JOIN' && (
          <form onSubmit={handleJoinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--cw-text-muted)', fontWeight: 700 }}>
                Enter Room Code
              </label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="CW-XXXXXX"
                style={{
                  width: '100%',
                  marginTop: '6px',
                  padding: '12px 14px',
                  background: 'var(--cw-bg-surface)',
                  border: '1px solid var(--cw-border-gold)',
                  borderRadius: 'var(--cw-radius-md)',
                  color: 'var(--cw-gold-light)',
                  fontFamily: 'var(--cw-font-mono)',
                  fontSize: '16px',
                  fontWeight: 700,
                  textAlign: 'center',
                  outline: 'none',
                  letterSpacing: '2px'
                }}
              />
            </div>

            <button type="submit" className="btn-hero-watch-party" style={{ width: '100%', justifyContent: 'center' }}>
              <Users size={16} />
              <span>Connect to Room</span>
            </button>
          </form>
        )}

        {/* Tab 3: Import Safe URL */}
        {activeTab === 'IMPORT' && (
          <form onSubmit={handleImportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--cw-text-muted)', fontWeight: 700 }}>
                Stream Title (Optional)
              </label>
              <input
                type="text"
                value={importTitle}
                onChange={(e) => setImportTitle(e.target.value)}
                placeholder="E.g. Study Session / Documentary..."
                style={{
                  width: '100%',
                  marginTop: '6px',
                  padding: '10px 14px',
                  background: 'var(--cw-bg-surface)',
                  border: '1px solid var(--cw-border-subtle)',
                  borderRadius: 'var(--cw-radius-md)',
                  color: '#fff',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--cw-text-muted)', fontWeight: 700 }}>
                Verified Stream URL
              </label>
              <input
                type="text"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... or https://.../movie.mp4"
                style={{
                  width: '100%',
                  marginTop: '6px',
                  padding: '10px 14px',
                  background: 'var(--cw-bg-surface)',
                  border: '1px solid var(--cw-border-subtle)',
                  borderRadius: 'var(--cw-radius-md)',
                  color: '#fff',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>

            {importError && (
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                padding: '10px 12px',
                background: 'rgba(229, 9, 20, 0.15)',
                border: '1px solid var(--cw-border-crimson)',
                borderRadius: 'var(--cw-radius-md)',
                color: '#ffb3b6',
                fontSize: '12px',
                lineHeight: '1.4'
              }}>
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{importError}</span>
              </div>
            )}

            <button type="submit" className="btn-hero-watch-now" style={{ width: '100%', justifyContent: 'center' }}>
              <Link2 size={16} />
              <span>Validate & Stream</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
