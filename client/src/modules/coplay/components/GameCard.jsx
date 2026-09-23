import React, { useState } from 'react';
import { Play, Users, Heart, ShieldAlert, ShieldCheck, Swords, Info, Gamepad2, User, ExternalLink, Trophy } from 'lucide-react';
import { GameMode, LicenseStatus, DistributionStatus } from '../gameSchema.js';
import './GameCard.css';

export default function GameCard({
  game,
  onPlay,
  onChallenge,
  onSquad,
  onViewDetails,
  isFavorite,
  onToggleFavorite,
  onViewLeaderboard
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isPendingLicense = game.licenseStatus === LicenseStatus.PENDING_REVIEW || 
                           game.licenseStatus === LicenseStatus.REMOVED ||
                           game.distributionStatus !== DistributionStatus.AVAILABLE;

  const isLocalCoop = game.gameMode === GameMode.LOCAL_COOP;
  const isMultiplayer = game.gameMode === GameMode.ONLINE_MULTIPLAYER;
  const isSinglePlayer = game.gameMode === GameMode.SINGLE_PLAYER;

  return (
    <div 
      className={`cogether-game-card ${isPendingLicense ? 'is-license-pending' : ''}`}
      onClick={() => onViewDetails(game)}
      role="article"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onViewDetails(game);
      }}
    >
      {/* ── 1. THUMBNAIL CONTAINER ── */}
      <div className="game-card-thumb-frame">
        {!imageLoaded && !imageError && <div className="card-thumb-skeleton" />}
        
        <img 
          src={game.thumbnail} 
          alt={game.title}
          className={`card-thumb-image ${imageLoaded ? 'loaded' : ''}`}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            setImageLoaded(true);
            setImageError(true);
          }}
        />

        <div className="card-thumb-overlay" />

        {/* Favorite Button */}
        <button 
          type="button"
          className={`btn-card-fav ${isFavorite ? 'active' : ''}`}
          onClick={(e) => onToggleFavorite(game.id, e)}
          title={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
          aria-label={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
        >
          <Heart size={15} fill={isFavorite ? '#ff0033' : 'none'} color={isFavorite ? '#ff0033' : '#ffffff'} />
        </button>

        {/* Game Mode Badge */}
        <div className="card-mode-badge-wrap">
          {isPendingLicense ? (
            <span className="badge-mode badge-soon">
              <span>SOON</span>
            </span>
          ) : isLocalCoop ? (
            <span className="badge-mode badge-local">
              <Gamepad2 size={11} />
              <span>2 PLAYER</span>
            </span>
          ) : isMultiplayer ? (
            <span className="badge-mode badge-multi">
              <Users size={11} />
              <span>SQUAD</span>
            </span>
          ) : (
            <span className="badge-mode badge-solo">
              <User size={11} />
              <span>SOLO</span>
            </span>
          )}
        </div>

        {/* Open in new tab button on hover */}
        <button 
          type="button" 
          className="btn-card-tab-peek"
          onClick={(e) => {
            e.stopPropagation();
            window.open(`?mode=coplay&game=${game.id}`, '_blank');
          }}
          title="Play in New Tab"
          aria-label="Play in New Tab"
        >
          <ExternalLink size={13} />
        </button>

        {/* Leaderboard button on hover */}
        {onViewLeaderboard && (
          <button 
            type="button" 
            className="btn-card-leaderboard-peek"
            onClick={(e) => {
              e.stopPropagation();
              onViewLeaderboard(game);
            }}
            title="View Leaderboard"
            aria-label="View Leaderboard"
          >
            <Trophy size={13} />
          </button>
        )}

        {/* Info button on hover */}
        <button 
          type="button" 
          className="btn-card-info-peek"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails(game);
          }}
          title="View game details & controls"
          aria-label="View game details & controls"
        >
          <Info size={14} />
        </button>
      </div>

      {/* ── 2. METADATA & ACTIONS ── */}
      <div className="game-card-content">
        <div className="card-header-row">
          <h4 className="card-game-title" title={game.title}>{game.title}</h4>
        </div>

        <div className="card-meta-sub">
          <span className="meta-category-tag">{game.category.toUpperCase()}</span>
          <span className="meta-players-count">
            <Users size={12} />
            <span>
              {isLocalCoop ? '2 Players' : isMultiplayer ? `Up to ${game.maxPlayers}` : '1 Player'}
            </span>
          </span>
        </div>

        {/* ── 3. MODE-TAILORED ACTION BUTTONS ── */}
        <div className="card-actions-deck" onClick={(e) => e.stopPropagation()}>
          {isPendingLicense ? (
            <button 
              type="button" 
              className="btn-card-action btn-soon-action"
              onClick={() => onViewDetails(game)}
            >
              <span>COMING SOON</span>
            </button>
          ) : isLocalCoop ? (
            <button 
              type="button" 
              className="btn-card-action btn-primary-arcade"
              onClick={() => onPlay(game)}
            >
              <Gamepad2 size={14} />
              <span>PLAY 2P</span>
            </button>
          ) : isMultiplayer ? (
            <>
              <button 
                type="button" 
                className="btn-card-action btn-primary-arcade"
                onClick={() => onPlay(game)}
                title="Play game"
              >
                <Play size={13} fill="#000000" />
                <span>PLAY</span>
              </button>
              <button 
                type="button" 
                className="btn-card-action btn-squad-arcade"
                onClick={() => onSquad(game)}
                title="Create Squad Room with Camera & Audio"
              >
                <Users size={13} />
                <span>SQUAD</span>
              </button>
            </>
          ) : (
            <>
              <button 
                type="button" 
                className="btn-card-action btn-primary-arcade"
                onClick={() => onPlay(game)}
              >
                <Play size={13} fill="#000000" />
                <span>PLAY</span>
              </button>
              {game.challengeSupported && (
                <button 
                  type="button" 
                  className="btn-card-action btn-challenge-arcade"
                  onClick={() => onChallenge(game)}
                  title="Challenge a friend with split-screen cameras"
                >
                  <Swords size={13} />
                  <span>DUEL</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
