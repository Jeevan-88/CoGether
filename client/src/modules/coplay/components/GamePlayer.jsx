import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Maximize, Minimize, AlertOctagon, RotateCw, 
  ArrowLeft, Gamepad2, Users, ShieldAlert, Sparkles, Volume2, VolumeX 
} from 'lucide-react';
import { getGameProviderAdapter, GameLaunchError } from '../services/GameProviderAdapter.js';
import { GameMode, LicenseStatus } from '../gameSchema.js';
import './GamePlayer.css';

export default function GamePlayer({
  game,
  onClose,
  onLaunchSquadRoom
}) {
  const [loading, setLoading] = useState(true);
  const [launchError, setLaunchError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  const containerRef = useRef(null);
  const viewportRef = useRef(null);
  const adapterRef = useRef(null);

  // Initialize and launch game via Provider Adapter
  const launchGameSession = async () => {
    setLoading(true);
    setLaunchError(null);

    // Clean up previous adapter
    if (adapterRef.current) {
      adapterRef.current.destroy();
      adapterRef.current = null;
    }

    if (!game) {
      setLaunchError(new GameLaunchError('No game selected', 'ERR_NULL_GAME'));
      setLoading(false);
      return;
    }

    try {
      const adapter = getGameProviderAdapter(game);
      adapterRef.current = adapter;

      if (!viewportRef.current) {
        throw new GameLaunchError('Game viewport container not ready', 'ERR_NO_VIEWPORT');
      }

      // Clear viewport
      viewportRef.current.innerHTML = '';

      await adapter.launch(viewportRef.current, {
        onLoaded: () => setLoading(false),
        onError: (err) => {
          setLoading(false);
          setLaunchError(err);
        }
      });
    } catch (err) {
      setLoading(false);
      setLaunchError(err instanceof GameLaunchError ? err : new GameLaunchError(err.message, 'ERR_UNEXPECTED'));
    }
  };

  useEffect(() => {
    launchGameSession();

    return () => {
      if (adapterRef.current) {
        adapterRef.current.destroy();
        adapterRef.current = null;
      }
    };
  }, [game]);

  // Fullscreen management
  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => console.warn('Fullscreen error:', err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(err => console.warn('Exit fullscreen error:', err));
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const isLocalCoop = game?.gameMode === GameMode.LOCAL_COOP;
  const isMultiplayer = game?.gameMode === GameMode.ONLINE_MULTIPLAYER;

  return (
    <div className="game-player-theater-overlay fade-in" ref={containerRef}>
      {/* ── TOP CONTROLS HEADER BAR ── */}
      <header className="game-player-header-bar">
        <div className="player-left-meta">
          <button className="btn-player-back" onClick={onClose} title="Back to Game Arcade">
            <ArrowLeft size={16} />
            <span>BACK TO ARCADE</span>
          </button>
          <div className="player-game-title-block">
            <h3 className="player-title">{game?.title || 'Game'}</h3>
            <span className={`player-mode-tag mode-${game?.gameMode?.toLowerCase()}`}>
              {isLocalCoop ? 'LOCAL 2 PLAYER' : isMultiplayer ? 'MULTIPLAYER' : 'SINGLE PLAYER'}
            </span>
          </div>
        </div>

        <div className="player-right-controls">
          {isMultiplayer && onLaunchSquadRoom && (
            <button 
              type="button" 
              className="btn-player-squad-sync"
              onClick={() => onLaunchSquadRoom(game)}
              title="Open Camera & Audio Squad Room"
            >
              <Users size={15} />
              <span>SQUAD ROOM</span>
            </button>
          )}

          <button 
            type="button" 
            className="btn-player-action-icon"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
          </button>

          <button 
            type="button" 
            className="btn-player-close-x"
            onClick={onClose}
            title="Close Game"
            aria-label="Close Game"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* ── LOCAL 2-PLAYER DUAL CONTROLS BAR ── */}
      {isLocalCoop && !launchError && (
        <div className="player-local-coop-bar">
          <div className="coop-badge">
            <Gamepad2 size={14} />
            <span>LOCAL 2-PLAYER SESSION (SAME DEVICE)</span>
          </div>
          <div className="coop-controls-guide">
            <span className="coop-key-tag">P1: {game.controls?.p1 || 'WASD / Space'}</span>
            <span className="coop-divider">vs</span>
            <span className="coop-key-tag">P2: {game.controls?.p2 || 'Arrows / Enter'}</span>
          </div>
        </div>
      )}

      {/* ── GAME VIEWPORT STAGE ── */}
      <main className="game-viewport-stage">
        {/* Loading Skeleton */}
        {loading && !launchError && (
          <div className="player-loading-scrim">
            <div className="loading-spinner-arcade" />
            <span className="loading-text">INITIALIZING SECURE GAME PROVIDER...</span>
            <span className="loading-subtext">{game?.title}</span>
          </div>
        )}

        {/* Error Screen (Never a blank black frame) */}
        {launchError && (
          <div className="game-unavailable-error-card fade-in">
            <div className="error-icon-shield">
              <AlertOctagon size={42} />
            </div>
            <h2 className="error-headline">GAME UNAVAILABLE</h2>
            <p className="error-subtext">We couldn't launch this game right now.</p>
            
            <div className="error-reason-box">
              <span className="error-code-badge">{launchError.code || 'ERR_LAUNCH_FAILED'}</span>
              <p className="error-message">{launchError.message}</p>
            </div>

            <div className="error-actions-deck">
              <button 
                type="button" 
                className="btn-arcade-retry"
                onClick={launchGameSession}
              >
                <RotateCw size={15} />
                <span>RETRY LAUNCH</span>
              </button>
              <button 
                type="button" 
                className="btn-arcade-back"
                onClick={onClose}
              >
                <ArrowLeft size={15} />
                <span>BACK TO ARCADE</span>
              </button>
            </div>
          </div>
        )}

        {/* Provider Adapter DOM Target */}
        <div 
          ref={viewportRef} 
          className={`game-iframe-wrapper-slot ${launchError ? 'has-error' : ''}`} 
        />
      </main>
    </div>
  );
}
