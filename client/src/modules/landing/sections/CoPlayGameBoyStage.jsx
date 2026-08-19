import React from 'react';
import './CoPlayGameBoyStage.css';

// FAMOUS HIGH-RES ONLINE GAME LOGOS FOR 3D CUBE FACES
const FAMOUS_GAME_TILES_FACE1 = [
  { name: 'Subway Surfers', img: 'https://img.gamemonetize.com/tmhj9i3trg8ot0u7h9qahh6flzn9zkjp/512x384.jpg' },
  { name: 'Temple Run 2', img: 'https://img.gamemonetize.com/q6u8ghlmkx9rhy48udltwan4cqmmoxxm/512x384.jpg' },
  { name: 'Smash Karts', img: 'https://img.gamemonetize.com/rrflwl9gzd8jw3wpk6mzgwfzi32pvnlp/512x384.jpg' },
  { name: 'Shell Shockers', img: 'https://img.gamemonetize.com/ou0bfqy1ejiobw4yb4ozvj23t85x2xxj/512x384.jpg' },
  { name: 'Moto X3M', img: 'https://img.gamemonetize.com/5q7rgv3nxbtcx1doq963t8t8ax6sc0ss/512x384.jpg' },
  { name: 'Car Stunt Master', img: 'https://img.gamemonetize.com/gixytcyqjodb9t1bd6z6c2bhuc0n2zqi/512x384.jpg' },
  { name: 'Retro Bowl', img: 'https://img.gamemonetize.com/zo8ocq9uu0gjavl3iazgiessapj6ov6n/512x384.jpg' },
  { name: 'Drive Mad', img: 'https://img.gamemonetize.com/fz2a4g1h9hdohgcyd7em6c6n3wggsfw0/512x384.jpg' },
  { name: 'Tuk Tuk Auto', img: 'https://img.gamemonetize.com/e3nqbd83zbz64dri00qtgftk6ke4reds/512x384.jpg' }
];

const FAMOUS_GAME_TILES_FACE2 = [
  { name: 'Shifted Realms', img: 'https://img.gamemonetize.com/ou0bfqy1ejiobw4yb4ozvj23t85x2xxj/512x384.jpg' },
  { name: 'Police Car Parking', img: 'https://img.gamemonetize.com/zo8ocq9uu0gjavl3iazgiessapj6ov6n/512x384.jpg' },
  { name: 'Mud Truck', img: 'https://img.gamemonetize.com/fz2a4g1h9hdohgcyd7em6c6n3wggsfw0/512x384.jpg' },
  { name: 'Season Change', img: 'https://img.gamemonetize.com/6xui5nnxg3d3r3frxs2003f38hjeig7r/512x384.jpg' },
  { name: 'Heroes Beware', img: 'https://img.gamemonetize.com/5q7rgv3nxbtcx1doq963t8t8ax6sc0ss/512x384.jpg' },
  { name: 'Subway Surfers', img: 'https://img.gamemonetize.com/tmhj9i3trg8ot0u7h9qahh6flzn9zkjp/512x384.jpg' },
  { name: 'Car Evolution', img: 'https://img.gamemonetize.com/rrflwl9gzd8jw3wpk6mzgwfzi32pvnlp/512x384.jpg' },
  { name: 'Offroad Jeep', img: 'https://img.gamemonetize.com/q6u8ghlmkx9rhy48udltwan4cqmmoxxm/512x384.jpg' },
  { name: 'Moto X3M', img: 'https://img.gamemonetize.com/5q7rgv3nxbtcx1doq963t8t8ax6sc0ss/512x384.jpg' }
];

const COPLAY_TYPO_ITEMS = Array(12).fill('CO-PLAY');

function AutomaticDiagonal3DRubiksCube() {
  return (
    <div className="automatic-diagonal-3d-stage stage-massive">
      {/* CONTINUOUS AUTOMATIC DIAGONAL ROTATION CUBE BODY */}
      <div className="rubiks-cube-diagonal-body cube-massive">
        {/* FACE 1: FRONT */}
        <div className="cube-face face-front">
          {FAMOUS_GAME_TILES_FACE1.map((g, idx) => (
            <div key={idx} className="cube-tile-cell">
              <img src={g.img} alt={g.name} />
            </div>
          ))}
        </div>

        {/* FACE 2: BACK */}
        <div className="cube-face face-back">
          {FAMOUS_GAME_TILES_FACE2.map((g, idx) => (
            <div key={idx} className="cube-tile-cell">
              <img src={g.img} alt={g.name} />
            </div>
          ))}
        </div>

        {/* FACE 3: RIGHT */}
        <div className="cube-face face-right">
          {FAMOUS_GAME_TILES_FACE1.map((g, idx) => (
            <div key={idx} className="cube-tile-cell">
              <img src={g.img} alt={g.name} />
            </div>
          ))}
        </div>

        {/* FACE 4: LEFT */}
        <div className="cube-face face-left">
          {FAMOUS_GAME_TILES_FACE2.map((g, idx) => (
            <div key={idx} className="cube-tile-cell">
              <img src={g.img} alt={g.name} />
            </div>
          ))}
        </div>

        {/* FACE 5: TOP */}
        <div className="cube-face face-top">
          {FAMOUS_GAME_TILES_FACE1.map((g, idx) => (
            <div key={idx} className="cube-tile-cell">
              <img src={g.img} alt={g.name} />
            </div>
          ))}
        </div>

        {/* FACE 6: BOTTOM */}
        <div className="cube-face face-bottom">
          {FAMOUS_GAME_TILES_FACE2.map((g, idx) => (
            <div key={idx} className="cube-tile-cell">
              <img src={g.img} alt={g.name} />
            </div>
          ))}
        </div>
      </div>

      {/* FLOOR REFLECTION SHADOW */}
      <div className="cube-3d-floor-shadow shadow-massive" />
    </div>
  );
}

/**
 * CoPlayGameBoyStage Component
 * Renders the sticky pinned 3D zoom & split door section,
 * the 3D PC Monitor, the continuous 3D rotating Rubik's cube,
 * and the 100+ Arcade Games launch action.
 */
export default function CoPlayGameBoyStage({
  coplaySplitProgress,
  textZoomOpacity,
  coplayZoomScale,
  gameboyBlendOpacity,
  onOpenGamesHub,
  onStartGames
}) {
  return (
    <section className="sticky-pinned-coplay-stage-wrapper" style={{ height: '450vh', position: 'relative' }}>
      <div className="sticky-pinned-coplay-stage-inner">
        <div className="underlying-white-page-reveal">
          <div className="white-page-grid-split">
            
            {/* LEFT HALF: 3D PC MONITOR */}
            <div className="left-hero-media-wrapper">
              <div className="user-3d-pc-monitor-wrapper">
                <img src="/pc_monitor_artwork.png" alt="3D PC Monitor" className="user-pc-monitor-art" />
                <div className="pc-monitor-screen-video-overlay">
                  <video autoPlay loop muted playsInline className="placeholder-demo-video">
                    <source src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" type="video/mp4" />
                    <source src="https://media.w3.org/2010/05/sintel/trailer.mp4" type="video/mp4" />
                  </video>
                </div>
              </div>
            </div>

            {/* RIGHT HALF: 100+ ONLINE GAMES ARCADE HUB */}
            <div 
              className="right-games-rubiks-hub" 
              onClick={onOpenGamesHub || onStartGames}
              style={{ cursor: 'pointer' }}
            >
              <div className="vertical-filled-typography-column text-center-all">
                <h3 className="hero-word-top text-center">P L A Y</h3>
                <div className="giant-1000-cube-overlay-stack">
                  <h2 className="hero-word-giant-1000-behind">100+</h2>
                  <div className="embedded-diagonal-cube-box center-front-cube">
                    <AutomaticDiagonal3DRubiksCube />
                  </div>
                </div>
                <h4 className="hero-word-multiplayer text-center">MULTIPLAYER & ONLINE GAMES</h4>
                <button 
                  className="btn-arcade-explore-pill" 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenGamesHub) onOpenGamesHub();
                    else if (onStartGames) onStartGames();
                  }}
                  style={{
                    marginTop: '14px',
                    background: '#FFE500',
                    color: '#000000',
                    border: '3px solid #000000',
                    borderRadius: '30px',
                    padding: '10px 24px',
                    fontFamily: "'Impact', sans-serif",
                    fontSize: '1.05rem',
                    letterSpacing: '0.04em',
                    cursor: 'pointer',
                    boxShadow: '4px 4px 0px #000000'
                  }}
                >
                  🎮 OPEN 100+ GAMES ARCADE →
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* TOP DOOR */}
        <div
          className="coplay-split-door-top"
          style={{
            transform: `translateY(-${coplaySplitProgress * 100}%)`,
            zIndex: 20
          }}
        >
          <div className="coplay-door-canvas-content">
            {textZoomOpacity > 0.01 && (
              <div
                className="coplay-zoomable-content-wrapper"
                style={{
                  transform: `scale(${coplayZoomScale})`,
                  transformOrigin: 'center center',
                  opacity: textZoomOpacity
                }}
              >
                <div className="coplay-pure-typo-container">
                  <div className="coplay-typo-row">
                    <div className="coplay-typo-track scroll-left">
                      {COPLAY_TYPO_ITEMS.map((item, idx) => (
                        <span key={idx} className="coplay-typo-text text-small-white">{item} <span className="typo-dot">•</span></span>
                      ))}
                    </div>
                  </div>
                  <div className="coplay-typo-row row-center-zoom-target">
                    <div className="coplay-typo-track scroll-right">
                      {COPLAY_TYPO_ITEMS.map((item, idx) => (
                        <span key={idx} className="coplay-typo-text text-main-white">{item} <span className="typo-dot">•</span></span>
                      ))}
                    </div>
                  </div>
                  <div className="coplay-typo-row">
                    <div className="coplay-typo-track scroll-left">
                      {COPLAY_TYPO_ITEMS.map((item, idx) => (
                        <span key={idx} className="coplay-typo-text text-stroke">{item} <span className="typo-dot">•</span></span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="gameboy-perfect-fit-overlay gameboy-top-half" style={{ opacity: gameboyBlendOpacity }}>
              <img src="/gameboy_pixel_art.png" alt="GameBoy Pixel Art" className="gameboy-fitted-img" />
            </div>
          </div>
        </div>

        {/* BOTTOM DOOR */}
        <div
          className="coplay-split-door-bottom"
          style={{
            transform: `translateY(${coplaySplitProgress * 100}%)`,
            zIndex: 20
          }}
        >
          <div className="coplay-door-canvas-content">
            {textZoomOpacity > 0.01 && (
              <div
                className="coplay-zoomable-content-wrapper"
                style={{
                  transform: `scale(${coplayZoomScale})`,
                  transformOrigin: 'center center',
                  opacity: textZoomOpacity
                }}
              >
                <div className="coplay-pure-typo-container">
                  <div className="coplay-typo-row">
                    <div className="coplay-typo-track scroll-left">
                      {COPLAY_TYPO_ITEMS.map((item, idx) => (
                        <span key={idx} className="coplay-typo-text text-small-white">{item} <span className="typo-dot">•</span></span>
                      ))}
                    </div>
                  </div>
                  <div className="coplay-typo-row row-center-zoom-target">
                    <div className="coplay-typo-track scroll-right">
                      {COPLAY_TYPO_ITEMS.map((item, idx) => (
                        <span key={idx} className="coplay-typo-text text-main-white">{item} <span className="typo-dot">•</span></span>
                      ))}
                    </div>
                  </div>
                  <div className="coplay-typo-row">
                    <div className="coplay-typo-track scroll-left">
                      {COPLAY_TYPO_ITEMS.map((item, idx) => (
                        <span key={idx} className="coplay-typo-text text-stroke">{item} <span className="typo-dot">•</span></span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="gameboy-perfect-fit-overlay gameboy-bottom-half" style={{ opacity: gameboyBlendOpacity }}>
              <img src="/gameboy_pixel_art.png" alt="GameBoy Pixel Art" className="gameboy-fitted-img" />
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
