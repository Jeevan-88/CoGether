import React from 'react';
import { ExternalLink, Users, Play, Shield, Monitor } from 'lucide-react';

export default function ProviderCard({
  provider,
  onOpenProvider,
  onWatchTogether,
  onWatchInCoWatch
}) {
  const getFactualCapabilityLabel = (p) => {
    if (p.id === 'youtube') return 'Watch directly in CoWatch';
    if (p.id === 'netflix') return 'Watch with your Netflix account';
    if (p.id === 'prime_video') return 'Open in Prime Video';
    if (p.id === 'crunchyroll') return 'Watch with your Crunchyroll account';
    if (p.id === 'jiohotstar') return 'Watch with your JioHotstar account';
    if (p.id === 'disney_plus') return 'Watch with your Disney+ account';
    if (p.id === 'sports_broadcaster') return 'Official sports broadcast companion';
    if (p.id === 'public_domain') return 'Public domain & open media archive';
    if (p.embedSupported) return 'Direct playback in CoWatch';
    if (p.accountRequired) return `Watch with your ${p.name} account`;
    return 'Synchronized external playback';
  };

  const handleOpen = (e) => {
    e.stopPropagation();
    if (onOpenProvider) onOpenProvider(provider);
    else if (provider.officialUrl) {
      window.open(provider.officialUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleWatchTogether = (e) => {
    e.stopPropagation();
    if (onWatchTogether) onWatchTogether(provider);
  };

  const handleEmbedWatch = (e) => {
    e.stopPropagation();
    if (onWatchInCoWatch) onWatchInCoWatch(provider);
  };

  return (
    <div className="cowatch-provider-card">
      <div className="provider-card-header">
        <div className="provider-card-logo-box">
          {provider.logoUrl ? (
            <img
              src={provider.logoUrl}
              alt={provider.name}
              className="provider-card-logo-img"
              loading="lazy"
            />
          ) : (
            <div className="provider-card-logo-fallback">
              {provider.name.charAt(0)}
            </div>
          )}
        </div>
        <div className="provider-card-title-box">
          <h3 className="provider-card-name">{provider.name}</h3>
          <span className="provider-card-capability-label">
            {getFactualCapabilityLabel(provider)}
          </span>
        </div>
      </div>

      <div className="provider-card-badges-row">
        {provider.drmProtected && (
          <span className="provider-subtle-badge" title="Protected media cannot be captured via screen-share">
            <Shield size={10} /> DRM Protected
          </span>
        )}
        {provider.accountRequired && (
          <span className="provider-subtle-badge">
            Personal Account Required
          </span>
        )}
        {provider.embedSupported && (
          <span className="provider-subtle-badge badge-gold">
            In-App Player
          </span>
        )}
      </div>

      <div className="provider-card-actions">
        {provider.embedSupported ? (
          <button
            type="button"
            className="btn-provider-primary"
            onClick={handleEmbedWatch}
          >
            <Play size={12} fill="currentColor" />
            <span>Watch in CoWatch</span>
          </button>
        ) : (
          <button
            type="button"
            className="btn-provider-secondary"
            onClick={handleOpen}
          >
            <ExternalLink size={12} />
            <span>Open {provider.name.split(' ')[0]}</span>
          </button>
        )}

        <button
          type="button"
          className="btn-provider-party"
          onClick={handleWatchTogether}
        >
          <Users size={13} />
          <span>Watch Together</span>
        </button>
      </div>
    </div>
  );
}
