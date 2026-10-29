import React, { useState } from 'react';
import './WatchTogetherSetupModal.css';

export default function WatchTogetherSetupModal({
  isOpen,
  title,
  platform,
  platformName,
  onClose,
  onStartCompanionRoom,
  onStartScreenShare,
  onBrowseFree
}) {
  // Step 1: User account? (null | 'yes' | 'no')
  // Step 2: Friends account? ('all' | 'some' | 'none')
  // Step 3: Decision Outcome (Case A, Case B, or Case C)
  const [step, setStep] = useState(1);
  const [userHasAccount, setUserHasAccount] = useState(null);
  const [friendCount, setFriendCount] = useState(2);
  const [friendsStatus, setFriendsStatus] = useState(null);

  if (!isOpen) return null;

  const currentPlatform = platformName || (platform ? platform.toUpperCase() : 'Subscription Platform');

  // Decision calculation
  const getDecisionCase = () => {
    if (userHasAccount === 'yes' && friendsStatus === 'all') {
      return 'CASE_A'; // Everyone has subscription -> Browser Extension Sync
    }
    if ((userHasAccount === 'yes' && (friendsStatus === 'some' || friendsStatus === 'none')) ||
        (userHasAccount === 'no' && friendsStatus === 'some')) {
      return 'CASE_B'; // Hybrid -> Screen Share workflow
    }
    return 'CASE_C'; // Nobody has account -> Subscription needed / Free alternative
  };

  const decision = getDecisionCase();

  const handleNextFromStep1 = (hasAccount) => {
    setUserHasAccount(hasAccount);
    setStep(2);
  };

  const handleFinishStep2 = (friendsAcc) => {
    setFriendsStatus(friendsAcc);
    setStep(3);
  };

  const handleReset = () => {
    setStep(1);
    setUserHasAccount(null);
    setFriendsStatus(null);
  };

  return (
    <div className="wt-overlay" onClick={onClose}>
      <div className="wt-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="wt-header">
          <div className="wt-badge">
            <span className="wt-badge-dot"></span>
            <span>Watch Together · Setup</span>
          </div>
          <button className="wt-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Stepper bar */}
        <div className="wt-stepper">
          <div className={`wt-step-pill ${step >= 1 ? (step === 1 ? 'active' : 'completed') : ''}`}></div>
          <div className={`wt-step-pill ${step >= 2 ? (step === 2 ? 'active' : 'completed') : ''}`}></div>
          <div className={`wt-step-pill ${step === 3 ? 'active' : ''}`}></div>
        </div>

        {/* Modal Body */}
        <div className="wt-body">
          {/* ──────────────── STEP 1: Host Subscription ──────────────── */}
          {step === 1 && (
            <>
              <div className="wt-title-row">
                <h3>Do you have an account on {currentPlatform}?</h3>
                <p>
                  To watch <strong>{title}</strong> together in the highest quality, tell us about your {currentPlatform} subscription.
                </p>
              </div>

              <div className="wt-cards-grid">
                <button
                  type="button"
                  className={`wt-flashcard ${userHasAccount === 'yes' ? 'selected' : ''}`}
                  onClick={() => handleNextFromStep1('yes')}
                >
                  <div className="wt-card-icon" style={{ color: '#4ade80' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div className="wt-card-title">YES, I have an account</div>
                  <div className="wt-card-desc">
                    I have an active subscription or login on {currentPlatform}.
                  </div>
                </button>

                <button
                  type="button"
                  className={`wt-flashcard ${userHasAccount === 'no' ? 'selected' : ''}`}
                  onClick={() => handleNextFromStep1('no')}
                >
                  <div className="wt-card-icon" style={{ color: '#ef4444' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </div>
                  <div className="wt-card-title">NO, I don’t have one</div>
                  <div className="wt-card-desc">
                    I do not currently have a subscription to {currentPlatform}.
                  </div>
                </button>
              </div>

              <div className="wt-actions">
                <button className="wt-btn wt-btn-secondary" onClick={onClose}>
                  Cancel
                </button>
              </div>
            </>
          )}

          {/* ──────────────── STEP 2: Friends Subscription ──────────────── */}
          {step === 2 && (
            <>
              <div className="wt-title-row">
                <h3>Do your friends have accounts?</h3>
                <p>
                  Configure your watch party group to pick the optimal playback sync method.
                </p>
              </div>

              {/* Friends counter */}
              <div className="wt-counter-widget">
                <div className="wt-counter-row">
                  <div className="wt-counter-label">
                    <span>Number of Friends Joining</span>
                    <b>{friendCount} {friendCount === 1 ? 'Friend' : 'Friends'} (Total Party: {friendCount + 1})</b>
                  </div>
                  <div className="wt-stepper-ctrls">
                    <button
                      type="button"
                      className="wt-counter-btn"
                      disabled={friendCount <= 1}
                      onClick={() => setFriendCount((c) => Math.max(1, c - 1))}
                    >
                      -
                    </button>
                    <span className="wt-counter-val">{friendCount}</span>
                    <button
                      type="button"
                      className="wt-counter-btn"
                      disabled={friendCount >= 8}
                      onClick={() => setFriendCount((c) => Math.min(8, c + 1))}
                    >
                      +
                    </button>
                  </div>
                </div>

                <input
                  type="range"
                  min="1"
                  max="8"
                  value={friendCount}
                  onChange={(e) => setFriendCount(parseInt(e.target.value, 10))}
                  className="wt-slider"
                />
              </div>

              {/* Questions about friend status */}
              <div className="wt-cards-grid">
                {userHasAccount === 'yes' ? (
                  <>
                    <button
                      type="button"
                      className={`wt-flashcard ${friendsStatus === 'all' ? 'selected' : ''}`}
                      onClick={() => handleFinishStep2('all')}
                    >
                      <div className="wt-card-icon" style={{ color: '#4ade80' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                      </div>
                      <div className="wt-card-title">All have accounts</div>
                      <div className="wt-card-desc">
                        Every friend has their own {currentPlatform} subscription.
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`wt-flashcard ${friendsStatus === 'some' ? 'selected' : ''}`}
                      onClick={() => handleFinishStep2('some')}
                    >
                      <div className="wt-card-icon" style={{ color: '#f59e0b' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 6v6l4 2" />
                        </svg>
                      </div>
                      <div className="wt-card-title">Some or none do</div>
                      <div className="wt-card-desc">
                        I will host the stream so everyone can watch together.
                      </div>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className={`wt-flashcard ${friendsStatus === 'some' ? 'selected' : ''}`}
                      onClick={() => handleFinishStep2('some')}
                    >
                      <div className="wt-card-icon" style={{ color: '#4ade80' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      <div className="wt-card-title">A friend has account</div>
                      <div className="wt-card-desc">
                        One of my friends has a subscription and will share their screen.
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`wt-flashcard ${friendsStatus === 'none' ? 'selected' : ''}`}
                      onClick={() => handleFinishStep2('none')}
                    >
                      <div className="wt-card-icon" style={{ color: '#ef4444' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                        </svg>
                      </div>
                      <div className="wt-card-title">Nobody has account</div>
                      <div className="wt-card-desc">
                        None of us have an active subscription to {currentPlatform}.
                      </div>
                    </button>
                  </>
                )}
              </div>

              <div className="wt-actions">
                <button className="wt-btn wt-btn-secondary" onClick={() => setStep(1)}>
                  ← Back
                </button>
              </div>
            </>
          )}

          {/* ──────────────── STEP 3: Playback Decision Logic ──────────────── */}
          {step === 3 && (
            <>
              {/* CASE A: Everyone has subscription */}
              {decision === 'CASE_A' && (
                <div className="wt-outcome-card">
                  <div className="wt-outcome-icon" style={{ color: '#4ade80' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </div>
                  <h3 className="wt-outcome-title">All Subscribers Connected!</h3>
                  <p className="wt-outcome-desc">
                    Awesome! Since everyone has access to <strong>{currentPlatform}</strong>, you can synchronize playback seamlessly in <strong>full native 4K/HDR quality</strong> with pristine multi-channel audio.
                  </p>

                  <div className="wt-feature-list">
                    <div className="wt-feature-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>No DRM black screens or browser lag</span>
                    </div>
                    <div className="wt-feature-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Play, pause, and seek timestamps synced via CoGether Extension</span>
                    </div>
                    <div className="wt-feature-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Companion Party Room with audio/video deck & real-time chat</span>
                    </div>
                  </div>

                  <div className="wt-actions" style={{ width: '100%' }}>
                    <a
                      href="/extension/cogether-extension.zip"
                      download="cogether-extension.zip"
                      className="wt-btn wt-btn-download"
                      title="Download Chrome/Edge Extension"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      <span>Download Extension (.zip)</span>
                    </a>
                    <button
                      className="wt-btn wt-btn-primary"
                      onClick={() => {
                        onClose();
                        onStartCompanionRoom();
                      }}
                    >
                      Enter Party Room →
                    </button>
                  </div>
                </div>
              )}

              {/* CASE B: Some have accounts, some do not */}
              {decision === 'CASE_B' && (
                <div className="wt-outcome-card">
                  <div className="wt-outcome-icon" style={{ color: '#f59e0b' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                  </div>
                  <h3 className="wt-outcome-title">Screen Sharing Stream Ready</h3>
                  <p className="wt-outcome-desc">
                    Since not everyone has a <strong>{currentPlatform}</strong> subscription, the account holder can stream their browser tab into the party room so all {friendCount + 1} members can watch live together.
                  </p>

                  <div className="wt-feature-list">
                    <div className="wt-feature-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Only 1 member needs an active subscription</span>
                    </div>
                    <div className="wt-feature-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>WebRTC real-time audio and video broadcast to everyone in room</span>
                    </div>
                    <div className="wt-feature-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Interactive camera tiles and party room chat</span>
                    </div>
                  </div>

                  <div className="wt-actions" style={{ width: '100%' }}>
                    <button className="wt-btn wt-btn-secondary" onClick={handleReset}>
                      ← Change Setup
                    </button>
                    <button
                      className="wt-btn wt-btn-primary"
                      onClick={() => {
                        onClose();
                        onStartScreenShare();
                      }}
                    >
                      Start Screen Share Party →
                    </button>
                  </div>
                </div>
              )}

              {/* CASE C: Nobody has account */}
              {decision === 'CASE_C' && (
                <div className="wt-outcome-card">
                  <div className="wt-outcome-icon" style={{ color: '#ef4444' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <h3 className="wt-outcome-title">Subscription Required</h3>
                  <p className="wt-outcome-desc">
                    <strong>{title}</strong> is exclusively licensed on <strong>{currentPlatform}</strong> and requires an active subscription to view.
                  </p>

                  <div className="wt-summary-badge" style={{ margin: '4px 0' }}>
                    💡 Tip: Watch legally free public domain cinema with 0 subscriptions!
                  </div>

                  <div className="wt-actions" style={{ width: '100%' }}>
                    <button
                      className="wt-btn wt-btn-primary"
                      onClick={() => {
                        onClose();
                        onBrowseFree();
                      }}
                    >
                      ▶ Watch Free Cinema Instead
                    </button>
                    <button
                      className="wt-btn wt-btn-secondary"
                      onClick={() => {
                        window.open(`https://www.google.com/search?q=${encodeURIComponent(title + ' ' + currentPlatform)}`, '_blank');
                      }}
                    >
                      Visit {currentPlatform} ↗
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
