import React from 'react';
import './Navbar.css';

export default function Navbar({ activeTab, onTabChange, user, onOpenAuth, onOpenPricing, isScrolled, scrollProgress = 0, hideNavbar = false }) {
  const winW = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const winH = typeof window !== 'undefined' ? window.innerHeight : 800;

  // Aspect ratio of tight-cropped 8K 3D logo: 1076 / 5496 = 0.1957788
  const logoAspect = 1076 / 5496;

  // Phase 1: Logo flies from center to navbar in first 35% of scroll (scrollProgress 0 -> 0.35)
  const logoProgress = Math.min(scrollProgress / 0.35, 1);

  // Target navbar logo center coordinates inside 80px fixed header
  const containerOffset = Math.max((winW - 1440) / 2, 0);
  const navPaddingLeft = 32;
  const navLogoTargetHeight = 70;
  const navLogoTargetWidth = navLogoTargetHeight / logoAspect; // ~357.5px wide
  const navLogoTargetX = containerOffset + navPaddingLeft + (navLogoTargetWidth / 2);
  const navLogoTargetY = 40; // center of 80px fixed header

  // Hero center initial coordinates
  const heroImgCenterX = winW / 2;
  const heroImgCenterY = winH / 2;

  // Interpolated center X & Y as user scrolls during Phase 1
  const currentCenterX = heroImgCenterX + logoProgress * (navLogoTargetX - heroImgCenterX);
  const currentCenterY = heroImgCenterY + logoProgress * (navLogoTargetY - heroImgCenterY);

  // Hero initial width & height
  const heroInitialWidth = Math.min(winW * 0.85, 1150);
  const heroInitialHeight = heroInitialWidth * logoAspect;

  // Scale interpolation
  const targetScale = navLogoTargetWidth / heroInitialWidth;
  const currentScale = 1 - (logoProgress * (1 - targetScale));

  const currentW = heroInitialWidth * currentScale;
  const currentH = heroInitialHeight * currentScale;

  const posX = currentCenterX - (currentW / 2);
  const posY = currentCenterY - (currentH / 2);

  return (
    <header className={`cogether-navbar ${isScrolled ? 'scrolled-header-active' : ''} ${hideNavbar ? 'navbar-transparent-coshop' : ''}`}>
      {/* SINGLE CONTINUOUS 8K 3D LOGO: Flies up to top-left navbar header during Phase 1 */}
      <img
        src="/cogether-transparent-hd.png?v=11"
        alt="CoGether"
        className="cogether-single-animated-logo"
        onClick={() => {
          if (scrollProgress > 0) window.scrollTo({ top: 0, behavior: 'smooth' });
          else onTabChange('home');
        }}
        style={{
          position: 'fixed',
          left: `${posX}px`,
          top: `${posY}px`,
          width: `${currentW}px`,
          height: `${currentH}px`,
          zIndex: hideNavbar ? 0 : 250,
          cursor: 'pointer',
          objectFit: 'contain',
          pointerEvents: hideNavbar ? 'none' : 'auto',
          opacity: hideNavbar ? 0 : 1,
          transition: 'opacity 0.4s ease, transform 0.4s ease'
        }}
      />

      <div className="navbar-container">
        {/* Reserved header logo spacer */}
        <div className="navbar-brand-logo" onClick={() => onTabChange('home')} />

        {/* Pixar-style nav links: uppercase, spaced, pure white */}
        <nav className="nav-menu-links">
          <button
            className={`nav-menu-btn ${activeTab === 'watch' ? 'active' : ''}`}
            onClick={() => onTabChange('watch')}
          >
            Co-Watch
          </button>
          <button
            className={`nav-menu-btn ${activeTab === 'games' ? 'active' : ''}`}
            onClick={() => onTabChange('games')}
          >
            Co-Play
          </button>
          <button
            className={`nav-menu-btn ${activeTab === 'shop' ? 'active' : ''}`}
            onClick={() => onTabChange('watch')}
          >
            Co-Shop
          </button>
          <button
            className={`nav-menu-btn ${activeTab === 'telepresence' ? 'active' : ''}`}
            onClick={() => onTabChange('telepresence')}
          >
            Co-Study
          </button>
        </nav>

        {/* Right: oval white buttons */}
        <div className="nav-right-actions">
          {user ? (
            <div className="user-nav-badge">
              <span>{user.name}</span>
            </div>
          ) : (
            <button className="btn-login-rect" onClick={onOpenAuth}>
              Log In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
