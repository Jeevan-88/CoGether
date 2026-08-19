import React from 'react';

/**
 * HeroSection Component
 * Renders the fullscreen pure black hero container with the animated tagline
 * and trigonometric sine-wave starburst laser flare with cross and diagonal beams.
 */
export default function HeroSection({ heroScroll, isBurstActive, burstOpacity, crossScale }) {
  return (
    <section className="fullscreen-pure-black-hero">
      <div className="hero-center-content-wrapper">
        <div className="genz-tagline-container">
          <p
            className="genz-tagline-text"
            style={{
              opacity: heroScroll < 0.80 ? 1 : 0,
              filter: burstOpacity > 0 ? `brightness(${1 + burstOpacity * 3.5})` : 'none'
            }}
          >
            WATCH • PLAY • SHOP • STUDY WITH YOUR INNER CIRCLE
          </p>

          {/* HORIZONTAL & VERTICAL CROSS LASER BEAMS + CENTER STARBURST FLARE */}
          {isBurstActive && (
            <div
              className="procedural-lightburst-flare"
              style={{
                opacity: burstOpacity,
                transform: `translate(-50%, -50%) scale(${0.7 + burstOpacity * 2.2})`,
                pointerEvents: 'none',
                display: 'block'
              }}
            >
              <div className="flare-core-burst" />
              <div
                className="horizontal-laser-beam"
                style={{ transform: `translateY(-50%) scaleX(${1 + crossScale * 2})` }}
              />
              <div
                className="vertical-laser-beam"
                style={{ transform: `translateX(-50%) scaleY(${1 + crossScale * 2})` }}
              />
              <div className="diagonal-laser-beam-1" />
              <div className="diagonal-laser-beam-2" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
