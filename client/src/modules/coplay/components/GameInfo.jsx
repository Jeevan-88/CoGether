import React from 'react';
import { ExternalLink, ShieldCheck, Keyboard, Tag } from 'lucide-react';
import './GameInfo.css';

/**
 * GameInfo
 * Minimal, clean metadata tray positioned cleanly below the game frame.
 * Displays only verified, scannable facts:
 * - Verified title & open-source provenance
 * - Controls quick guide
 * - License status and repository source link
 */
export default function GameInfo({ game }) {
  if (!game) return null;

  const displayTitle = game.title?.replace(/\(Official Open-Source\)/i, '— Open Source') || 'Game';

  return (
    <section className="game-minimal-info-bar" aria-label="Game Details">
      <div className="info-primary-meta">
        <div className="info-title-row">
          <h2 className="info-title">{displayTitle}</h2>
          <span className="info-category-tag">
            <Tag size={12} />
            <span>{game.category || 'Arcade'}</span>
          </span>
          {game.licenseStatus && (
            <span className="info-license-badge">
              <ShieldCheck size={12} />
              <span>{game.sourceLicense || 'OPEN SOURCE'}</span>
            </span>
          )}
        </div>

        {game.controls?.p1 && (
          <div className="info-controls-snippet">
            <Keyboard size={13} className="snippet-icon" />
            <span className="snippet-label">Controls:</span>
            <span className="snippet-value">{game.controls.p1}</span>
          </div>
        )}
      </div>

      <div className="info-secondary-meta">
        {game.sourceRepository && (
          <a
            href={game.sourceRepository}
            target="_blank"
            rel="noopener noreferrer"
            className="info-source-link"
            title="View original repository on GitHub"
          >
            <span>Source Code</span>
            <ExternalLink size={12} />
          </a>
        )}
      </div>
    </section>
  );
}
