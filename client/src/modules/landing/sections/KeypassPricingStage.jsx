import React from 'react';

/**
 * KeypassPricingStage Component
 * Renders the inverted triangle Master Keypass display (₹49/mo),
 * the editorial psychological reality check cards, and the verdict banner.
 */
export default function KeypassPricingStage({ onOpenPricing, setIsCursorHovering }) {
  return (
    <div className="inverted-triangle-key-section-wrapper">
      {/* CENTER KEY HERO DISPLAY */}
      <div className="center-black-inverted-triangle">
        <h2 className="key-section-title">
          THE MASTER KEYPASS.
        </h2>
        <p className="key-section-subtitle-mono">
          One pass. Millisecond-synced 4K cinema, private study desks, live game rooms & collective cart.
        </p>

        {/* STATIC CHROME KEY WITH SLEEK WHITE EDGE GLOW & MONOCHROME PRICE TAG */}
        <div className="wavy-floating-key-wrapper">
          <img src="/plain_crystal_key.png" alt="Monochrome Master Keypass" className="glowing-wavy-key-img" />
          <div className="hanging-thread-line" />
          <span className="hanging-price-tag-badge">KEYPASS // ₹49 / MO</span>
        </div>

        <br />
        <button 
          className="btn-triangle-key-buy" 
          onClick={onOpenPricing}
          onMouseEnter={() => setIsCursorHovering && setIsCursorHovering(true)}
          onMouseLeave={() => setIsCursorHovering && setIsCursorHovering(false)}
        >
          ACQUIRE KEYPASS - ₹49 →
        </button>
      </div>

      {/* EDITORIAL REALITY CHECK CARDS (OBSIDIAN CHARCOAL & WARM CREAM) */}
      <div className="triangle-side-cards-wrapper">
        {/* LEFT CHARCOAL MATTE CARD */}
        <div 
          className="side-psych-card left-card-red"
          onMouseEnter={() => setIsCursorHovering && setIsCursorHovering(true)}
          onMouseLeave={() => setIsCursorHovering && setIsCursorHovering(false)}
        >
          <span className="side-card-badge">[ 01 // PSYCHOLOGICAL REALITY ]</span>
          <p className="side-card-body">
            <strong>Why would you not acquire this key?</strong> Do you really want your crush or partner studying and watching cinema with someone else while you scroll feeds alone in silence?
          </p>
        </div>

        {/* RIGHT EDITORIAL CREAM CARD */}
        <div 
          className="side-psych-card right-card-pink"
          onMouseEnter={() => setIsCursorHovering && setIsCursorHovering(true)}
          onMouseLeave={() => setIsCursorHovering && setIsCursorHovering(false)}
        >
          <span className="side-card-badge">[ 02 // PERFORMANCE METRIC ]</span>
          <p className="side-card-body">
            <strong>Are you gonna let your circle hit straight A's</strong> in private 4K Co-Study rooms while you're locked out crying over laggy 480p screen shares?
          </p>
        </div>
      </div>

      {/* BOTTOM FULL-WIDTH EDITORIAL BANNER */}
      <div 
        className="bottom-gold-truth-card"
        onMouseEnter={() => setIsCursorHovering && setIsCursorHovering(true)}
        onMouseLeave={() => setIsCursorHovering && setIsCursorHovering(false)}
      >
        <span className="truth-mono-tag">[ 03 // THE VERDICT ]</span>
        <p className="truth-quote-text">
          "I READ THE REALITY CHECK. THE ARCHITECTURE IS UNDENIABLE. TAKE THE ₹49 AND UNLOCK EVERYTHING."
        </p>
        <button 
          className="btn-truth-claim-key" 
          onClick={onOpenPricing}
          onMouseEnter={() => setIsCursorHovering && setIsCursorHovering(true)}
          onMouseLeave={() => setIsCursorHovering && setIsCursorHovering(false)}
        >
          CLAIM UNLIMITED ACCESS →
        </button>
      </div>
    </div>
  );
}
