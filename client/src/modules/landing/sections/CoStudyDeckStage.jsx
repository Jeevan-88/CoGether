import React from 'react';
import './CoStudyDeckStage.css';
import { ArrowRight } from 'lucide-react';

/**
 * CoStudyDeckStage Component
 * Renders the circular letter 'O' portal zoom with rotating dots ring & graduation cap,
 * and the interactive 4-slide manifesto deck with 3D page flip transitions.
 */
export default function CoStudyDeckStage({
  effectiveCostudyScroll,
  oTuner,
  oPanShiftPct,
  portalZoomScale,
  portalOpacity,
  handleSetTargetPoint,
  dotsRotationDeg,
  activeNodeckSlide,
  setActiveNodeckSlide,
  handleLaunch
}) {
  return (
    <div className="sticky-pinned-costudy-stage-wrapper" style={{ height: '450vh', position: 'relative' }}>
      <section className="costudy-sticky-stage">
        {effectiveCostudyScroll < 0.65 && (
          <div
            className={`centered-costudy-headline-wrapper ${oTuner.showReticle ? 'clickable-target-active' : ''}`}
            style={{
              transform: `translate(calc(-50% + ${oPanShiftPct}%), -50%) scale(${portalZoomScale})`,
              transformOrigin: `${oTuner.zoomTargetX}% ${oTuner.zoomTargetY}%`,
              opacity: portalOpacity
            }}
            onClick={handleSetTargetPoint}
          >
            <div className="costudy-text-row">
              <span className="char-c">C</span>
              <div className="co-letter-o-custom-circle">
                {/* GRADUATION CAP / MORTARBOARD ON TOP OF 'O' 🎓 */}
                <img src="/graduation_cap.png" alt="Graduation Cap" className="o-graduation-cap" />
                <div className="o-black-circle-body"><div className="o-cream-center-hole" style={{ width: `46%`, height: `46%` }} /></div>
                <svg className="o-dots-ring-perfect" viewBox="0 0 100 100" style={{ transform: `translate(-50%, -50%) rotate(${dotsRotationDeg}deg)` }}>
                  {Array.from({ length: 12 }).map((_, i) => {
                    const angle = (i * 30 * Math.PI) / 180;
                    const cx = 50 + 43.5 * Math.cos(angle);
                    const cy = 50 + 43.5 * Math.sin(angle);
                    return <circle key={i} cx={cx.toFixed(1)} cy={cy.toFixed(1)} r="3.0" fill="#ffffff" />;
                  })}
                </svg>
              </div>
              <span className="char-hyphen">-</span>
              <span className="char-study">STUDY</span>
            </div>
          </div>
        )}

        {/* NODECK.ONLINE STYLE INTERACTIVE DECK SHOWCASE */}
        {effectiveCostudyScroll >= 0.35 && (
          <div className={`nodeck-stage-container ${activeNodeckSlide === 1 || activeNodeckSlide === 4 ? 'bg-pink' : 'bg-cream'} fade-in`}>
            {/* TOP BRANDING TAG BADGE */}
            <div className="nodeck-top-header">
              <span className="nodeck-top-tag-pill">
                {activeNodeckSlide === 1 && '01 / THE PROBLEM'}
                {activeNodeckSlide === 2 && '02 / THE MANIFESTO'}
                {activeNodeckSlide === 3 && '03 / WHAT WE DON\'T DO'}
                {activeNodeckSlide === 4 && '04 / WIN THE EXAM.'}
              </span>
            </div>

            {/* MAIN SLIDE CONTENT CANVAS AREA WITH 3D PAGE FLIP ANIMATION */}
            <div className="nodeck-slide-canvas-animated">
              {/* SLIDE 1: THE PROBLEM */}
              {activeNodeckSlide === 1 && (
                <div key="slide-1" className="nodeck-slide1-split-layout nodeck-slide-page-flip">
                  <div className="nodeck-slide1-text-left">
                    <h2 className="nodeck-huge-headline text-left-aligned">
                      EVERY YEAR, MILLIONS OF HOURS ARE WASTED <mark className="nodeck-highlighter-green">STUDYING ALONE</mark>. CRAMMING <mark className="nodeck-highlighter-green">NOBODY ENJOYS</mark>, DISTRACTIONS <mark className="nodeck-highlighter-green">NOBODY ESCAPES</mark>, AND NOTES NOBODY REMEMBERS.
                    </h2>
                  </div>
                  <div className="nodeck-slide1-art-frame">
                    <div className="art-frame-badge">LO-FI STUDY VIBES 🎧</div>
                    <img src="/costudy_illustration.jpg" alt="Artistic Co-Study Desk" className="nodeck-art-img" />
                  </div>
                </div>
              )}

              {/* SLIDE 2: THE MANIFESTO */}
              {activeNodeckSlide === 2 && (
                <div key="slide-2" className="nodeck-slide2-split-layout nodeck-slide-page-flip">
                  <div className="nodeck-slide2-text-left">
                    <h2 className="nodeck-huge-headline text-left-aligned">
                      THE BEST STUDY SESSION IS A SHARED ONE.<sup>1</sup><br />
                      THE BEST DESK IS A CO-STUDY DESK.<sup>2</sup><br />
                      <mark className="nodeck-highlighter-green">THE BEST EXAM SCORE IS A TOP ONE.<sup>3</sup></mark>
                    </h2>
                    <div className="nodeck-footnotes-row" style={{ justifyContent: 'flex-start' }}>
                      <span><sup>1</sup> YES, WE MEAN IT.</span>
                      <span><sup>2</sup> LIVE 2-WAY CAM & LO-FI BEATS.</span>
                      <span><sup>3</sup> PRACTICE = DISTINCTIONS.</span>
                    </div>
                  </div>
                  <div className="nodeck-video-art-frame">
                    <div className="video-frame-badge">🔴 LIVE 2-WAY CAM STUDY</div>
                    <img src="/costudy_video_split.jpg" alt="Split Screen Live Study Room" className="nodeck-art-img" />
                  </div>
                </div>
              )}

              {/* SLIDE 3: WHAT WE DON'T DO */}
              {activeNodeckSlide === 3 && (
                <div key="slide-3" className="nodeck-slide3-layout nodeck-slide-page-flip">
                  <div className="nodeck-slide3-left">
                    <h2>WHAT WE<br /><mark className="nodeck-highlighter-green">DON'T DO</mark></h2>
                  </div>
                  <div className="nodeck-pinned-paper-card">
                    <span className="nodeck-red-pushpin">📍</span>
                    <ul className="nodeck-strikethrough-list">
                      <li>1. SOLITARY ISOLATED CRAMMING</li>
                      <li>2. ENDLESS INSTAGRAM DISTRACTIONS</li>
                      <li>3. BORING LONE READINGS</li>
                      <li>4. PASSIVE NO-ACCOUNTABILITY STUDYING</li>
                      <li>5. MEANINGLESS 100-PAGE DENSE PDFS</li>
                    </ul>
                    <p className="nodeck-pinned-caption">
                      THESE THINGS HAVE ONE THING IN COMMON: THEY FEEL LIKE STUDYING WITHOUT PRODUCING RESULTS. CO-STUDY REPLACES ISOLATION WITH LIVE STUDYMATES, SYNCED MUSIC, AND REAL FOCUS.
                    </p>
                  </div>
                </div>
              )}

              {/* SLIDE 4: WIN THE EXAM */}
              {activeNodeckSlide === 4 && (
                <div key="slide-4" className="nodeck-cards-grid nodeck-slide-page-flip">
                  <div className="nodeck-deck-card">
                    <span className="nodeck-card-tag">01 / VIRTUAL DESKS</span>
                    <div className="nodeck-card-body">
                      VIRTUAL QUIET DESKS.<br />
                      SCREEN SHARE.<br />
                      LO-FI RAIN BEATS.<br />
                      ZERO DISTRACTION.
                    </div>
                    <button className="nodeck-card-action-btn" onClick={() => handleLaunch('watch')}>
                      Join Study Desk <ArrowRight size={16} />
                    </button>
                  </div>

                  <div className="nodeck-deck-card">
                    <span className="nodeck-card-tag">02 / TRIVIA BATTLES</span>
                    <div className="nodeck-card-body">
                      WE FIND WHAT'S KILLING YOUR FOCUS AND HELP YOU CRUSH IT WITH MULTIPLAYER QUIZ BATTLES.
                    </div>
                    <button className="nodeck-card-action-btn" onClick={() => handleLaunch('watch')}>
                      Play Quiz Battles <ArrowRight size={16} />
                    </button>
                  </div>

                  <div className="nodeck-deck-card">
                    <span className="nodeck-card-tag">03 / LIVE CANVAS</span>
                    <div className="nodeck-card-body">
                      MORE DISTINCTIONS.<br />
                      FEWER DERAILS.<br />
                      TOP MARKS.
                    </div>
                    <button className="nodeck-card-action-btn" onClick={() => handleLaunch('watch')}>
                      Open Shared Desk <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* BOTTOM FIXED NODECK NAVIGATION DOCK BAR */}
            <div className="nodeck-bottom-dock">
              <button
                className="btn-nodeck-nav"
                onClick={() => setActiveNodeckSlide(prev => Math.max(1, prev - 1))}
                disabled={activeNodeckSlide === 1}
              >
                ⟨ PREV
              </button>
              <div
                className="btn-nodeck-menu-circle"
                onClick={() => setActiveNodeckSlide(prev => (prev % 4) + 1)}
                title="Toggle Slide"
              >
                ≡
              </div>
              <button
                className="btn-nodeck-nav"
                onClick={() => setActiveNodeckSlide(prev => Math.min(4, prev + 1))}
                disabled={activeNodeckSlide === 4}
              >
                NEXT ⟩
              </button>
            </div>

            {/* SLIDE COUNTER BADGE */}
            <div className="nodeck-slide-badge">
              SLIDE {activeNodeckSlide}/4
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
