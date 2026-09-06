import React from 'react';
import { 
  X, Play, Users, Swords, Gamepad2, ShieldCheck, 
  ShieldAlert, Sparkles, Monitor, RotateCcw, AlertTriangle, 
  CheckCircle, ArrowRight, ExternalLink 
} from 'lucide-react';
import { GameMode, LicenseStatus, DistributionStatus } from '../gameSchema.js';
import CoGetherButton from './CoGetherButton.jsx';
import './GameDetailsModal.css';

export default function GameDetailsModal({
  game,
  onClose,
  onPlay,
  onChallenge,
  onSquad
}) {
  if (!game) return null;

  const isPendingLicense = game.licenseStatus === LicenseStatus.PENDING_REVIEW || 
                           game.licenseStatus === LicenseStatus.REMOVED ||
                           game.distributionStatus !== DistributionStatus.AVAILABLE;

  const isLocalCoop = game.gameMode === GameMode.LOCAL_COOP;
  const isMultiplayer = game.gameMode === GameMode.ONLINE_MULTIPLAYER;

  return (
    <div className="game-details-backdrop fade-in" onClick={onClose} role="dialog" aria-modal="true">
      <div className="game-details-card" onClick={(e) => e.stopPropagation()}>
        {/* Header Hero Banner */}
        <div className="details-hero-banner" style={{ backgroundImage: `url(${game.thumbnail})` }}>
          <div className="details-hero-overlay" />
          <button className="btn-close-details" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>

          <div className="details-hero-content">
            <span className="details-category-pill">{game.category.toUpperCase()}</span>
            <h2 className="details-title">{game.title}</h2>
            <div className="details-badges-row">
              <span className={`details-mode-badge mode-${game.gameMode.toLowerCase()}`}>
                {game.gameMode.replace('_', ' ')}
              </span>
              <span className="details-player-badge">
                <Users size={12} />
                <span>Max: {isLocalCoop ? '2 (Local Co-Op)' : game.maxPlayers}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="details-body-scroll">
          {/* Licensing & Distribution Status Banner */}
          <div className={`details-license-status-box ${isPendingLicense ? 'status-pending' : 'status-authorized'}`}>
            <div className="status-icon-col">
              {isPendingLicense ? <ShieldAlert size={22} /> : <ShieldCheck size={22} />}
            </div>
            <div className="status-text-col">
              <h4>{isPendingLicense ? 'Rights Verification Pending' : 'License Verified & Authorized'}</h4>
              <p>
                {isPendingLicense 
                  ? 'CoGether strictly complies with copyright law and does not scrape, rehost, or embed unauthorized commercial games. This title remains in catalog preview until publisher rights are verified.' 
                  : 'This title has verified open-source licensing. 100% local, ad-free, sandboxed execution with complete credential isolation.'}
              </p>
              <div className="status-meta-tags">
                <span className="meta-tag-item">License: <strong>{game.sourceLicense || game.licenseStatus}</strong></span>
                <span className="meta-tag-item">Status: <strong>{game.distributionStatus}</strong></span>
                <span className="meta-tag-item">Provider: <strong>{game.provider}</strong></span>
                {game.launchType && <span className="meta-tag-item">Runtime: <strong>{game.launchType}</strong></span>}
              </div>
            </div>
          </div>

          {/* Provenance & Attribution Section */}
          <div className="details-section">
            <h3 className="section-label">PROVENANCE & ATTRIBUTION</h3>
            <div className="provenance-card">
              {game.sourceRepository && (
                <div className="prov-row">
                  <span className="prov-lbl">Source Repository:</span>
                  {game.sourceRepository.startsWith('http') ? (
                    <a href={game.sourceRepository} target="_blank" rel="noopener noreferrer" className="prov-link">
                      {game.sourceRepository}
                    </a>
                  ) : (
                    <span className="prov-txt">{game.sourceRepository}</span>
                  )}
                </div>
              )}
              {game.sourceLicense && (
                <div className="prov-row">
                  <span className="prov-lbl">Software License:</span>
                  <span className="prov-tag">{game.sourceLicense}</span>
                </div>
              )}
              {game.attribution && (
                <div className="prov-row">
                  <span className="prov-lbl">Required Attribution:</span>
                  <span className="prov-txt">{game.attribution}</span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="details-section">
            <h3 className="section-label">OVERVIEW</h3>
            <p className="details-description-text">{game.description}</p>
          </div>

          {/* Controls Information */}
          <div className="details-section">
            <h3 className="section-label">CONTROLS & INPUT</h3>
            <div className="controls-cards-grid">
              <div className="control-card">
                <span className="control-player-label">PLAYER 1</span>
                <p className="control-keys-text">{game.controls?.p1 || 'Standard Keyboard / Touch'}</p>
              </div>
              {game.controls?.p2 && (
                <div className="control-card p2-highlight">
                  <span className="control-player-label">PLAYER 2 (SAME KEYBOARD)</span>
                  <p className="control-keys-text">{game.controls.p2}</p>
                </div>
              )}
            </div>
            {game.controls?.description && (
              <p className="controls-summary-footnote">{game.controls.description}</p>
            )}
          </div>

          {/* Social Gaming Features */}
          <div className="details-section">
            <h3 className="section-label">COGETHER SOCIAL FEATURES</h3>
            <div className="social-features-grid">
              <div className="social-feature-item">
                <Monitor size={15} />
                <span>Fullscreen 1080p: {game.fullscreenSupported ? 'Supported' : 'Standard'}</span>
              </div>
              <div className="social-feature-item">
                <Users size={15} />
                <span>Video Call / Cam: {game.cameraSupported ? 'Enabled' : 'Audio Only'}</span>
              </div>
              <div className="social-feature-item">
                <Swords size={15} />
                <span>Synchronized Challenge: {game.challengeSupported ? 'Ready' : 'Multiplayer Only'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="details-footer-actions">
          {isPendingLicense ? (
            <div className="pending-actions-bar">
              <CoGetherButton
                variant="ghost"
                disabled={true}
                icon={AlertTriangle}
                fullWidth={true}
              >
                PLAYBACK UNAVAILABLE (RIGHTS PENDING)
              </CoGetherButton>
            </div>
          ) : isLocalCoop ? (
            <CoGetherButton
              variant="primary"
              onClick={() => {
                onClose();
                onPlay(game);
              }}
              icon={Gamepad2}
              fullWidth={true}
            >
              LAUNCH LOCAL 2-PLAYER MATCH
            </CoGetherButton>
          ) : isMultiplayer ? (
            <div className="dual-launch-actions">
              <CoGetherButton
                variant="secondary"
                onClick={() => {
                  onClose();
                  onPlay(game);
                }}
                icon={Play}
              >
                PLAY SOLO
              </CoGetherButton>
              <CoGetherButton
                variant="primary"
                onClick={() => {
                  onClose();
                  onSquad(game);
                }}
                icon={Users}
              >
                CREATE SQUAD ROOM
              </CoGetherButton>
            </div>
          ) : (
            <div className="dual-launch-actions">
              <CoGetherButton
                variant="primary"
                onClick={() => {
                  onClose();
                  onPlay(game);
                }}
                icon={Play}
              >
                PLAY NOW
              </CoGetherButton>
              {game.challengeSupported && (
                <CoGetherButton
                  variant="secondary"
                  onClick={() => {
                    onClose();
                    onChallenge(game);
                  }}
                  icon={Swords}
                >
                  CHALLENGE A FRIEND
                </CoGetherButton>
              )}
              <CoGetherButton
                variant="ghost"
                onClick={() => {
                  onClose();
                  window.open(`?mode=coplay&game=${game.id}`, '_blank');
                }}
                icon={ExternalLink}
              >
                PLAY IN NEW TAB
              </CoGetherButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
