import React from 'react';

/**
 * LandingFooter Component
 * Minimalist official studio footer with creator watermark and repository links.
 */
export default function LandingFooter() {
  return (
    <footer className="jeevan-official-footer" style={{ position: 'relative', zIndex: 20 }}>
      <div className="footer-watermark-row">
        <span className="creator-tag">COGETHER // DIRECTED BY JEEVAN YADAV</span>
        <div className="footer-links">
          <a href="mailto:jeevan@cogether.app">EMAIL</a>
          <a href="https://github.com/Jeevan-88/CoGether.git" target="_blank" rel="noreferrer">REPOSITORY</a>
          <a href="#privacy">TERMS & PRIVACY</a>
        </div>
      </div>
      <p className="copyright-text">
        © 2026 COGETHER INC. ALL RIGHTS RESERVED. ARCHITECTURE BY JEEVAN YADAV.
      </p>
    </footer>
  );
}
