import React from 'react';
import { ArrowRight, Maximize2, Volume2, VolumeX, MessageSquare, Move } from 'lucide-react';

const MOVIE_STREAMING_APPS = [
  { name: 'Netflix', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg' },
  { name: 'Disney+ Hotstar', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/1e/Disney%2B_Hotstar_logo.svg' },
  { name: 'Prime Video', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Prime_Video.png' },
  { name: 'HBO Max', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/17/HBO_Max_Logo.svg' },
  { name: 'Apple TV+', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/28/Apple_TV_Plus_Logo.svg' },
  { name: 'Hulu', logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e4/Hulu_Logo.svg' },
  { name: 'Sony LIV', logo: 'https://upload.wikimedia.org/wikipedia/en/7/7b/SonyLIV_logo.png' },
  { name: 'Zee5', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/5a/ZEE5_logo.svg' }
];

const SPORTS_CHANNELS = [
  { name: 'ESPN+', logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a2/ESPN%2B_logo.svg' },
  { name: 'Sky Sports', logo: 'https://upload.wikimedia.org/wikipedia/commons/3/37/Sky_Sports_logo_2020.svg' },
  { name: 'DAZN', logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a4/DAZN_Logo_Master_RGB_2018.svg' },
  { name: 'Sony Sports', logo: 'https://upload.wikimedia.org/wikipedia/en/7/7b/SonyLIV_logo.png' },
  { name: 'Star Sports', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/1e/Disney%2B_Hotstar_logo.svg' },
  { name: 'Eurosport', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/06/Eurosport_logo.svg' },
  { name: 'NBA TV', logo: 'https://upload.wikimedia.org/wikipedia/commons/7/7a/NBA_TV.svg' },
  { name: 'Willow HD', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Willow_TV_logo.svg' }
];

const ANIME_NETWORKS = [
  { name: 'Crunchyroll', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Crunchyroll_Logo.svg' },
  { name: 'Funimation', logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b7/Funimation_Logo.svg' },
  { name: 'HiDive', logo: 'https://upload.wikimedia.org/wikipedia/commons/3/36/HiDive_logo.svg' },
  { name: 'Ani-One Asia', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/14/Ani-One_Asia.png' },
  { name: 'Muse Asia', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/52/Muse_Asia_Logo.png' },
  { name: 'Netflix Anime', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg' },
  { name: 'Toonami', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Toonami_2012_logo.png' },
  { name: 'Tubi Anime', logo: 'https://upload.wikimedia.org/wikipedia/commons/d/db/Tubi_logo.svg' }
];

const TUTORIAL_MESSAGES = [
  { sender: 'Alex', text: 'CoGether makes Co-Watch & Co-Play feel like real life! 🍿', color: '#a855f7' },
  { sender: 'Sam', text: 'Yooo! We are sitting in the same room! 🔥', color: '#3b82f6' },
  { sender: 'Alex', text: 'Let\'s start Co-Play Online Games next!', color: '#a855f7' }
];

/**
 * CoWatchPistolStage Component
 * Renders the 360-degree inward zigzag door spin (Red -> Yellow),
 * the live tutorial video player with merged telepresence camera box,
 * and the 3 ink pistols with flying bullet rays and torn paper marquee banners.
 */
export default function CoWatchPistolStage({
  isFullyLockedYellow,
  isYellowStage,
  spinProgress,
  isYellowCanvas,
  isSpinning,
  doorSpinAngle,
  camBoxSize,
  setCamBoxSize,
  cycleCamSize,
  handleLaunch,
  isMuted,
  setIsMuted,
  activeMsgIdx,
  tutorialStep,
  bulletProgress,
  whiteLineOpacity
}) {
  return (
    <section className="sticky-pinned-red-stage-wrapper" style={{ height: '450vh', position: 'relative' }}>
      <div className={`sticky-pinned-red-stage-inner ${isFullyLockedYellow || isYellowStage ? 'bg-full-yellow' : ''}`}>
        {/* BACKGROUND VOID BOLD CONDENSED REVEAL TYPOGRAPHY */}
        <div
          className="center-void-condensed-typography"
          style={{
            display: spinProgress >= 0.95 ? 'none' : 'block'
          }}
        >
          <h1 className="katapult-condensed-headline">CO-WATCH</h1>
        </div>

        {/* LEFT DOOR PANEL */}
        <div
          className={`door-half-panel door-panel-left ${isYellowCanvas ? 'bg-yellow' : 'bg-red'} ${isSpinning ? 'is-spinning' : ''} ${isFullyLockedYellow ? 'no-clip' : ''}`}
          style={{
            transform: isFullyLockedYellow ? 'none' : `rotateY(${-doorSpinAngle}deg)`
          }}
        >
          {!isYellowCanvas ? (
            <div className="door-content-left-red">
              <div className="watch-together-badge">CO-WATCH HUB</div>
              <h2 className="red-section-headline">Synchronized Movies & TV Shows</h2>
              <p className="red-section-sub">
                Stream movies, TV shows, and videos synchronized to the exact millisecond with integrated real-time video calls.
              </p>
              <div className="how-it-works-switcher-box">
                <span className="switcher-label">CAMERA RESIZER (CoGether Room):</span>
                <div className="switcher-btns-row">
                  <button className={`switch-btn ${camBoxSize === 'sm' ? 'active-size' : ''}`} onClick={() => setCamBoxSize('sm')}>Small</button>
                  <button className={`switch-btn ${camBoxSize === 'md' ? 'active-size' : ''}`} onClick={() => setCamBoxSize('md')}>Medium</button>
                  <button className={`switch-btn ${camBoxSize === 'lg' ? 'active-size' : ''}`} onClick={() => setCamBoxSize('lg')}>Large</button>
                </div>
              </div>
              <button className="btn-black-launch-party" onClick={() => handleLaunch('watch')}>
                Launch Co-Watch Room <ArrowRight size={18} />
              </button>
            </div>
          ) : (
            <div className="plain-yellow-half" />
          )}
        </div>

        {/* RIGHT DOOR PANEL */}
        <div
          className={`door-half-panel door-panel-right ${isYellowCanvas ? 'bg-yellow' : 'bg-red'} ${isSpinning ? 'is-spinning' : ''} ${isFullyLockedYellow ? 'no-clip' : ''}`}
          style={{
            transform: isFullyLockedYellow ? 'none' : `rotateY(${doorSpinAngle}deg)`
          }}
        >
          {!isYellowCanvas ? (
            <div className="door-content-right-red">
              <div className="video-player-box-red">
                <div className="video-overlay-bar">
                  <span className="live-sync-pill"><span className="red-live-dot" /> CoGether Live Room</span>
                  <div className="overlay-actions-right">
                    <button className="resize-cam-btn-icon" onClick={cycleCamSize}><Maximize2 size={14} /> Resize</button>
                    <button className="mute-toggle-ic-btn" onClick={() => setIsMuted(!isMuted)}>
                      {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                    </button>
                  </div>
                </div>
                <video autoPlay loop muted={isMuted} playsInline className="commercial-cinematic-video">
                  <source src="https://media.w3.org/2010/05/sintel/trailer.mp4" type="video/mp4" />
                </video>
                <div className="live-chat-video-overlay fade-in">
                  <div className="chat-bubble-card">
                    <div className="bubble-sender" style={{ color: TUTORIAL_MESSAGES[activeMsgIdx]?.color || '#a855f7' }}>
                      <MessageSquare size={12} /> {TUTORIAL_MESSAGES[activeMsgIdx]?.sender || 'Alex'}
                    </div>
                    <div className="bubble-text">{TUTORIAL_MESSAGES[activeMsgIdx]?.text || ''}</div>
                  </div>
                </div>
                <div className={`cogether-merged-view-box zero-center-line size-${camBoxSize} fade-in`}>
                  <div className="cogether-header-strip">
                    <span className="good-icon">✓</span> CoGether Merged Room
                    <button className="quick-resize-ic" onClick={cycleCamSize}><Move size={11} /></button>
                  </div>
                  <div className="merged-shared-room-stage zero-line-stage">
                    <div className="guy-merged-side">
                      <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80" alt="Alex" />
                      <span className="guy-tag-badge"><span className="dot-green" /> Alex</span>
                    </div>
                    <div className="guy-merged-side">
                      <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80" alt="Sam" />
                      <span className="guy-tag-badge"><span className="dot-blue" /> Sam</span>
                    </div>
                  </div>
                </div>
                <div className="app-tutorial-bottom-banner">
                  <div className={`tutorial-step-item ${tutorialStep === 1 ? 'active' : ''}`}><span className="step-num">1</span> Pick Co-Watch or Co-Play</div>
                  <div className={`tutorial-step-item ${tutorialStep === 2 ? 'active' : ''}`}><span className="step-num">2</span> Share Invite Link</div>
                  <div className={`tutorial-step-item ${tutorialStep === 3 ? 'active' : ''}`}><span className="step-num">3</span> Hang Out Together Live</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="plain-yellow-half" />
          )}
        </div>

        {/* YELLOW STAGE WITH 3 CLEAN PISTOLS & 3 BULLETS */}
        {isFullyLockedYellow && (
          <div className="pistol-bullet-torn-paper-stage fade-in">
            <div className="ink-stage-header">
              <span className="ink-eyebrow-stamp">墨絵 • STREAMING HUBS</span>
              <h2 className="ink-title-kanji">SELECT STREAMING DESTINATION</h2>
            </div>

            <div className="torn-banners-container-3">
              {/* ROW 1 */}
              <div className="pistol-banner-row row-left">
                <div className="pistol-static-wrapper pistol-left" style={{ position: 'relative' }}>
                  <img src="/pistol_artwork.png" alt="Pistol 1" className="pistol-ink-img facing-right" />
                  <div
                    className="bullet-flying-wrapper bullet-row-1"
                    style={{
                      position: 'absolute',
                      left: `calc(190px + ${bulletProgress * 70}vw)`,
                      top: '42px',
                      transform: 'translateY(-50%)',
                      opacity: bulletProgress > 0 && bulletProgress < 0.98 ? 1 : 0,
                      zIndex: 100
                    }}
                  >
                    <img src="/bullet_artwork.png" alt="Bullet 1" className="bullet-img facing-right" />
                  </div>
                </div>
                <div
                  className="torn-paper-white-banner"
                  style={{
                    clipPath: `polygon(0 0, ${bulletProgress * 100}% 0, ${bulletProgress * 100}% 100%, 0 100%)`
                  }}
                  onClick={() => handleLaunch('watch')}
                >
                  <div className="banner-content-inner">
                    <div className="banner-badge-tag">🎬 MOVIES & TV SHOWS</div>
                    <div className="marquee-track scroll-left">
                      {[...MOVIE_STREAMING_APPS, ...MOVIE_STREAMING_APPS].map((app, idx) => (
                        <div key={idx} className="marquee-app-item">
                          <img src={app.logo} alt={app.name} onError={(e) => { e.target.style.display = 'none'; }} />
                          <span>{app.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ROW 2 */}
              <div className="pistol-banner-row row-right">
                <div
                  className="torn-paper-white-banner"
                  style={{
                    clipPath: `polygon(${100 - bulletProgress * 100}% 0, 100% 0, 100% 100%, ${100 - bulletProgress * 100}% 100%)`
                  }}
                  onClick={() => handleLaunch('watch')}
                >
                  <div className="banner-content-inner">
                    <div className="banner-badge-tag sports-tag">⚽ LIVE SPORTS CHANNELS</div>
                    <div className="marquee-track scroll-right">
                      {[...SPORTS_CHANNELS, ...SPORTS_CHANNELS].map((app, idx) => (
                        <div key={idx} className="marquee-app-item">
                          <img src={app.logo} alt={app.name} onError={(e) => { e.target.style.display = 'none'; }} />
                          <span>{app.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pistol-static-wrapper pistol-right" style={{ position: 'relative' }}>
                  <img src="/pistol_artwork.png" alt="Pistol 2" className="pistol-ink-img facing-left" />
                  <div
                    className="bullet-flying-wrapper bullet-row-2"
                    style={{
                      position: 'absolute',
                      right: `calc(190px + ${bulletProgress * 70}vw)`,
                      top: '42px',
                      transform: 'translateY(-50%)',
                      opacity: bulletProgress > 0 && bulletProgress < 0.98 ? 1 : 0,
                      zIndex: 100
                    }}
                  >
                    <img src="/bullet_artwork.png" alt="Bullet 2" className="bullet-img facing-left" />
                  </div>
                </div>
              </div>

              {/* ROW 3 */}
              <div className="pistol-banner-row row-left">
                <div className="pistol-static-wrapper pistol-left" style={{ position: 'relative' }}>
                  <img src="/pistol_artwork.png" alt="Pistol 3" className="pistol-ink-img facing-right" />
                  <div
                    className="bullet-flying-wrapper bullet-row-3"
                    style={{
                      position: 'absolute',
                      left: `calc(190px + ${bulletProgress * 70}vw)`,
                      top: '42px',
                      transform: 'translateY(-50%)',
                      opacity: bulletProgress > 0 && bulletProgress < 0.98 ? 1 : 0,
                      zIndex: 100
                    }}
                  >
                    <img src="/bullet_artwork.png" alt="Bullet 3" className="bullet-img facing-right" />
                  </div>
                </div>

                <div
                  className="torn-paper-white-banner"
                  style={{
                    clipPath: `polygon(0 0, ${bulletProgress * 100}% 0, ${bulletProgress * 100}% 100%, 0 100%)`
                  }}
                  onClick={() => handleLaunch('watch')}
                >
                  <div className="banner-content-inner">
                    <div className="banner-badge-tag anime-tag">🎬 MOVIES & TV SHOWS</div>
                    <div className="marquee-track scroll-left">
                      {[...ANIME_NETWORKS, ...ANIME_NETWORKS].map((app, idx) => (
                        <div key={idx} className="marquee-app-item">
                          <img src={app.logo} alt={app.name} onError={(e) => { e.target.style.display = 'none'; }} />
                          <span>{app.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CLEAN WHITE VERTICAL ZIGZAG SEAM LINE */}
        <div
          className="vertical-zigzag-crack-container"
          style={{
            opacity: whiteLineOpacity,
            transition: 'opacity 0.15s ease',
            zIndex: 100
          }}
        >
          <svg className="vertical-zigzag-svg" viewBox="0 0 40 1200" preserveAspectRatio="none">
            <path
              d="M20,0 L5,60 L35,120 L5,180 L35,240 L5,300 L35,360 L5,420 L35,480 L5,540 L35,600 L5,660 L35,720 L5,780 L35,840 L5,900 L35,960 L5,1020 L35,1080 L5,1140 L20,1200"
              fill="none"
              stroke="#ffffff"
              strokeWidth="4"
            />
          </svg>
        </div>
      </div>
    </section>
  );
}
