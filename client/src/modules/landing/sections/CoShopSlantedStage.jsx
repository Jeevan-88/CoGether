import React from 'react';

const REAL_WOODEN_LETTERS = [
  { id: 'c1', char: 'C', img: '/letters/wood_letter_C.png' },
  { id: 'o1', char: 'O', img: '/letters/wood_letter_O.png' },
  { id: 'h1', isBulbHyphen: true, img: '/wood_hyphen_bulb.png' },
  { id: 's1', char: 'S', img: '/letters/wood_letter_S.png' },
  { id: 'h2', char: 'H', img: '/letters/wood_letter_H.png' },
  { id: 'o2', char: 'O', img: '/letters/wood_letter_O.png', isHangingTote: true },
  { id: 'p1', char: 'P', img: '/letters/wood_letter_P.png' }
];

/**
 * CoShopSlantedStage Component
 * Renders the 500vh sticky pinned Co-Shop stage with real wooden letter shelf,
 * smooth Pac-Man devour sweep animation, and the vertical split 3D room
 * with live co-shopping tablet video call overlay.
 */
export default function CoShopSlantedStage({
  coshopScrollProgress,
  shelfY,
  shelfScale,
  leftPlantSize,
  leftPlantX,
  leftPlantY,
  rightPlantSize,
  rightPlantX,
  rightPlantY,
  lettersX,
  lettersY,
  letterHeight,
  toteTop,
  toteHeight,
  tabletConfig,
  handleLaunch
}) {
  return (
    <div className="sticky-pinned-coshop-stage-wrapper" style={{ height: '500vh', position: 'relative' }}>
      <section
        className="static-coshop-canvas-section"
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          width: '100%',
          backgroundColor: coshopScrollProgress > 0.15 ? '#c4cbd2' : '#11151c'
        }}
      >
        {(() => {
          // ── PIECEWISE PROGRESS MAPPER (with internal pauses between stages) ──
          const raw = coshopScrollProgress;
          let p;
          if (raw <= 0.20)      p = raw * (0.25 / 0.20);
          else if (raw <= 0.25) p = 0.25;                                        // Hold 1 (~2s pause)
          else if (raw <= 0.55) p = 0.25 + ((raw - 0.25) / 0.30) * 0.35;        // Pacman sweep (0.25 -> 0.60)
          else if (raw <= 0.78) p = 0.60 + ((raw - 0.55) / 0.23) * 0.25;        // Vertical split 3D room reveal (0.60 -> 0.85)
          else                  p = 0.85 + Math.min(1, (raw - 0.78) / 0.10) * 0.15; // Final hold 2
          const csp = Math.min(1, Math.max(0, p));

          // ── PAC-MAN: sweep from -55vw to 110vw during csp 0.25 -> 0.60 ──
          const pacProgress = Math.max(0, Math.min(1, (csp - 0.25) / 0.35));
          const pacmanLeftVw = -55 + pacProgress * 165;
          const pacFront = pacmanLeftVw + 48;

          const eaten = {
            C:          pacFront >= 33,
            O1:         pacFront >= 40,
            leftPlant:  pacFront >= 45,
            bulb:       pacFront >= 50,
            S:          pacFront >= 55,
            H:          pacFront >= 61,
            O2:         pacFront >= 66,
            tote:       pacFront >= 66,
            P:          pacFront >= 72,
            rightPlant: pacFront >= 77,
            shelf:      pacFront >= 90,
          };

          const letterFrontThresholds = [eaten.C, eaten.O1, eaten.bulb, eaten.S, eaten.H, eaten.O2, eaten.P];
          const isPacmanActive = csp >= 0.25 && csp < 0.60;

          // ── VERTICAL SPLIT 3D ROOM REVEAL PROGRESS (0 -> 1) ──
          const revealProgress = Math.max(0, Math.min(1, (csp - 0.60) / 0.25));
          const roomBright = Math.min(csp * (1 / 0.25), 1);

          return (
            <>
              {/* 1. STAGE A: SHELF strictly before Pac-Man */}
              {csp < 0.25 && (
                <div className="coshop-static-center-container" style={{ position: 'relative', zIndex: 10 }}>
                  <div
                    className="static-wooden-log-shelf-wrapper"
                    style={{
                      transform: `translateY(${shelfY}px) scale(${shelfScale / 100})`,
                      opacity: 0.35 + 0.65 * roomBright
                    }}
                  >
                    <img src="/wooden_shelf_artwork.png" alt="Wooden Log Shelf" className="static-wooden-log-shelf-img"
                      style={{ position: 'relative', zIndex: 5, filter: `drop-shadow(0 16px 24px rgba(0,0,0,${0.65 - 0.25 * roomBright}))` }} />

                    <img src="/jade_plant_pot.png" alt="Left Plant" className="shelf-jade-plant plant-left"
                      style={{ height: `${leftPlantSize}px`, position: 'absolute', left: '20px', bottom: '30px',
                        transform: `translate(${leftPlantX}px, ${leftPlantY}px)`, zIndex: 40,
                        filter: 'drop-shadow(0 16px 22px rgba(0,0,0,0.65))' }} />

                    <img src="/jade_plant_pot.png" alt="Right Plant" className="shelf-jade-plant plant-right"
                      style={{ height: `${rightPlantSize}px`, position: 'absolute', right: '20px', bottom: '30px',
                        transform: `translate(${rightPlantX}px, ${rightPlantY}px)`, zIndex: 40,
                        filter: 'drop-shadow(0 16px 22px rgba(0,0,0,0.65))' }} />

                    <div className="static-letters-sitting-track"
                      style={{ position: 'absolute', bottom: '30px', left: '50%',
                        transform: `translateX(calc(-50% + ${lettersX}px)) translateY(${lettersY}px)`, zIndex: 20 }}>
                      {REAL_WOODEN_LETTERS.map((item) => (
                        <div key={item.id} className="static-wood-letter-wrapper">
                          {item.isBulbHyphen ? (
                            <img src={item.img} alt="Bulb" className="static-wood-hyphen-bulb-img"
                              style={{ height: `${Math.round(letterHeight * 0.8)}px`,
                                filter: `drop-shadow(0 0 ${16 * roomBright}px rgba(251,191,36,${0.85 * roomBright})) drop-shadow(0 0 ${35 * roomBright}px rgba(245,158,11,${0.55 * roomBright}))` }} />
                          ) : (
                            <>
                              <img src={item.img} alt={item.char} className="static-wood-letter-img"
                                style={{ height: `${letterHeight}px`, filter: `drop-shadow(0 16px 24px rgba(0,0,0,${0.75 - 0.2 * roomBright}))` }} />
                              {item.isHangingTote && (
                                <img src="/tote_bag.png" alt="Tote Bag" className="hanging-tote-bag-on-letter"
                                  style={{ top: `${toteTop}px`, height: `${toteHeight}px`, zIndex: 15,
                                    filter: 'drop-shadow(0 16px 22px rgba(0,0,0,0.65))' }} />
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. DURING PAC-MAN SWEEP: shelf devouring + clean yellow Pac-Man */}
              {isPacmanActive && (
                <>
                  <div className="coshop-static-center-container" style={{ position: 'relative', zIndex: 10 }}>
                    <div className="static-wooden-log-shelf-wrapper"
                      style={{ transform: `translateY(${shelfY}px) scale(${shelfScale / 100})`,
                        opacity: eaten.shelf ? 0 : 1 }}>
                      <img src="/wooden_shelf_artwork.png" alt="Shelf" className="static-wooden-log-shelf-img"
                        style={{ position: 'relative', zIndex: 5, filter: `drop-shadow(0 16px 24px rgba(0,0,0,0.4))` }} />

                      <img src="/jade_plant_pot.png" alt="Left Plant" className="shelf-jade-plant plant-left"
                        style={{ height: `${leftPlantSize}px`, position: 'absolute', left: '20px', bottom: '30px',
                          transform: `translate(${leftPlantX}px, ${leftPlantY}px)`, zIndex: 40,
                          filter: 'drop-shadow(0 16px 22px rgba(0,0,0,0.65))',
                          opacity: eaten.leftPlant ? 0 : 1, transition: 'opacity 0.15s' }} />

                      <img src="/jade_plant_pot.png" alt="Right Plant" className="shelf-jade-plant plant-right"
                        style={{ height: `${rightPlantSize}px`, position: 'absolute', right: '20px', bottom: '30px',
                          transform: `translate(${rightPlantX}px, ${rightPlantY}px)`, zIndex: 40,
                          filter: 'drop-shadow(0 16px 22px rgba(0,0,0,0.65))',
                          opacity: eaten.rightPlant ? 0 : 1, transition: 'opacity 0.15s' }} />

                      <div className="static-letters-sitting-track"
                        style={{ position: 'absolute', bottom: '30px', left: '50%',
                          transform: `translateX(calc(-50% + ${lettersX}px)) translateY(${lettersY}px)`, zIndex: 20 }}>
                        {REAL_WOODEN_LETTERS.map((item, idx) => {
                          const isEaten = letterFrontThresholds[idx];
                          return (
                            <div key={item.id} className="static-wood-letter-wrapper"
                              style={{ opacity: isEaten ? 0 : 1, transition: 'opacity 0.15s' }}>
                              {item.isBulbHyphen ? (
                                <img src={item.img} alt="Bulb" className="static-wood-hyphen-bulb-img"
                                  style={{ height: `${Math.round(letterHeight * 0.8)}px`,
                                    filter: `drop-shadow(0 0 16px rgba(251,191,36,0.85)) drop-shadow(0 0 35px rgba(245,158,11,0.55))`,
                                    opacity: eaten.bulb ? 0 : 1 }} />
                              ) : (
                                <>
                                  <img src={item.img} alt={item.char} className="static-wood-letter-img"
                                    style={{ height: `${letterHeight}px`, filter: `drop-shadow(0 16px 24px rgba(0,0,0,0.55))` }} />
                                  {item.isHangingTote && (
                                    <img src="/tote_bag.png" alt="Tote" className="hanging-tote-bag-on-letter"
                                      style={{ top: `${toteTop}px`, height: `${toteHeight}px`, zIndex: 15,
                                        filter: 'drop-shadow(0 16px 22px rgba(0,0,0,0.65))',
                                        opacity: eaten.tote ? 0 : 1, transition: 'opacity 0.15s' }} />
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* CLEAN PAC-MAN (Yellow SVG) */}
                  <div className="classic-svg-pacman-wrapper" style={{ left: `${pacmanLeftVw}vw`, zIndex: 50 }}>
                    <svg viewBox="0 0 100 100" className="pacman-seamless-svg">
                      <path fill="#ffcc00" d="M 50 50 L 98 22 A 48 48 0 1 0 98 78 Z" className="pacman-animated-mouth-path" />
                      <circle cx="48" cy="22" r="5.5" fill="#000000" />
                    </svg>
                  </div>
                </>
              )}

              {/* 3. VERTICAL SPLIT 3D MASTERPIECE ROOM STAGE */}
              {revealProgress > 0 && (
                <div className="coshop-vertical-split-container" style={{ opacity: Math.min(1, revealProgress * 1.5) }}>
                  {/* LEFT HALF: Grey 3D room half — Slides DOWN from Top */}
                  <div
                    className="coshop-left-vertical-panel"
                    style={{
                      transform: `translateY(${(1 - revealProgress) * -100}%)`
                    }}
                  />

                  {/* RIGHT HALF: Green 3D room half — Slides UP from Bottom */}
                  <div
                    className="coshop-right-vertical-panel"
                    style={{
                      transform: `translateY(${(1 - revealProgress) * 100}%)`
                    }}
                  />

                  {/* TABLET DISPLAY: LIVE CO-SHOP VIDEO CALL SHOPPING WITH FRIEND */}
                  {revealProgress >= 0.95 && (
                    <div
                      className="coshop-tablet-screen-overlay"
                      style={{
                        top: `${tabletConfig.top}%`,
                        left: `${tabletConfig.left}%`,
                        width: `${tabletConfig.width}px`,
                        height: `${tabletConfig.height}px`,
                        borderRadius: `${tabletConfig.borderRadius}px`,
                        transform: `translate(-50%, -50%) perspective(${tabletConfig.perspective}px) rotateX(${tabletConfig.rotateX}deg) rotateY(${tabletConfig.rotateY}deg) rotateZ(${tabletConfig.rotateZ}deg) skewX(${tabletConfig.skewX}deg) skewY(${tabletConfig.skewY}deg)`,
                        opacity: Math.min(1, (revealProgress - 0.95) / 0.05)
                      }}
                    >
                      {/* HEADER BAR INSIDE TABLET DISPLAY */}
                      <div className="tablet-coshop-header-bar">
                        <div className="store-pill">
                          <span className="live-red-dot" /> Amazon.in | CO-LIVE 🔴
                        </div>
                        <div className="shared-cart-pill">
                          🛒 Shared Cart (2 items • ₹2,598)
                        </div>
                      </div>

                      {/* LIVE SHOPPING VIDEO PLAY BODY */}
                      <div className="tablet-video-content-body">
                        <video
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="tablet-coshop-live-video"
                        >
                          <source src="https://media.w3.org/2010/05/sintel/trailer.mp4" type="video/mp4" />
                        </video>

                        {/* TWO FRIENDS LIVE VIDEO CALL OVERLAYS */}
                        <div className="friend-video-avatar avatar-left">
                          <div className="avatar-video-box">
                            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" alt="Jeevan (You)" />
                            <span className="live-cam-badge">Jeevan (You)</span>
                          </div>
                          <div className="reaction-bubble-pop">😍 "Love the brass finish!"</div>
                        </div>

                        <div className="friend-video-avatar avatar-right">
                          <div className="avatar-video-box">
                            <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80" alt="Maya (Friend)" />
                            <span className="live-cam-badge">Maya (Friend)</span>
                          </div>
                          <div className="reaction-bubble-pop">🛒 "Added to shared cart!"</div>
                        </div>

                        {/* BOTTOM SHOPPING ACTION CARD */}
                        <div className="tablet-product-bottom-card">
                          <div className="product-info-left">
                            <span className="prod-title">🪴 Brass Jade Plant Pot — Premium</span>
                            <span className="prod-price">₹1,299 <s className="old-price">₹2,499</s></span>
                          </div>
                          <button className="btn-buy-together-now" onClick={() => handleLaunch('watch')}>
                            Checkout Together →
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          );
        })()}
      </section>
    </div>
  );
}
