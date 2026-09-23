import React, { useState, useEffect, useMemo } from 'react';
import { 
  Swords, Trophy, Clock, Skull, Zap, RotateCw, ArrowLeft, Crown, 
  Wifi, Activity, ShieldCheck 
} from 'lucide-react';
import CoGetherButton from './CoGetherButton.jsx';
import './GameSplitArena.css';

/**
 * Generic Opponent Live Duel Stage
 * Dynamically displays real-time score telemetry, delta comparison,
 * status banners, and optional grid data for any CoPlay game.
 */
function GenericOpponentStage({
  game,
  opponent,
  localScore = 0,
  isEliminated = false,
  isWinner = false
}) {
  const oppScore = opponent.score || 0;
  const scoreDiff = oppScore - localScore;

  // Optional 2048 grid rendering if game provides serialized cell matrix
  const hasValidGrid = opponent.grid && Array.isArray(opponent.grid) && opponent.grid.length === 4;

  const getTileColor = (val) => {
    if (!val) return { bg: 'rgba(238, 228, 218, 0.35)', color: 'transparent' };
    const colors = {
      2: { bg: '#eee4da', color: '#776e65' },
      4: { bg: '#ede0c8', color: '#776e65' },
      8: { bg: '#f2b179', color: '#f9f6f2' },
      16: { bg: '#f59563', color: '#f9f6f2' },
      32: { bg: '#f67c5f', color: '#f9f6f2' },
      64: { bg: '#f65e3b', color: '#f9f6f2' },
      128: { bg: '#edcf72', color: '#f9f6f2' },
      256: { bg: '#edcc61', color: '#f9f6f2' },
      512: { bg: '#edc850', color: '#f9f6f2' },
      1024: { bg: '#edc53f', color: '#f9f6f2' },
      2048: { bg: '#edc22e', color: '#f9f6f2' }
    };
    return colors[val] || { bg: '#3c3a32', color: '#f9f6f2' };
  };

  return (
    <div className="generic-opponent-stage">
      {/* ── Top Telemetry Strip ── */}
      <div className="opponent-telemetry-header">
        <div className="telemetry-conn-pill">
          <span className="live-pulse-dot" />
          <Wifi size={12} />
          <span>REAL-TIME P2P SYNC</span>
        </div>
        <div className="telemetry-game-name">
          <span>{game?.title || 'Arcade Duel'}</span>
        </div>
      </div>

      {/* ── Main Score Comparison Hub ── */}
      <div className="opponent-score-hero">
        <span className="score-hero-label">LIVE TELEMETRY SCORE</span>
        <div className="score-hero-digits">
          <Zap size={22} className="score-bolt-icon" />
          <span className="score-number">{oppScore.toLocaleString()}</span>
        </div>

        {/* Delta relative to local player */}
        <div className="score-delta-badge-row">
          {scoreDiff > 0 ? (
            <span className="delta-pill delta-ahead">+{scoreDiff.toLocaleString()} AHEAD OF YOU</span>
          ) : scoreDiff < 0 ? (
            <span className="delta-pill delta-behind">-{Math.abs(scoreDiff).toLocaleString()} BEHIND YOU</span>
          ) : (
            <span className="delta-pill delta-tied">TIED WITH YOU</span>
          )}
        </div>
      </div>

      {/* ── Visualization: Mini Grid or Telemetry Pulse Wave ── */}
      {hasValidGrid ? (
        <div className="opponent-mini-grid-wrap">
          <div className="opponent-grid-2048">
            {opponent.grid.map((col, x) => (
              <div key={x} className="grid-col-2048">
                {col.map((cell, y) => {
                  const val = cell?.value || cell;
                  const { bg, color } = getTileColor(val);
                  return (
                    <div
                      key={`${x}-${y}`}
                      className={`tile-cell-2048 ${val ? 'has-value' : 'empty'}`}
                      style={{ backgroundColor: bg, color }}
                    >
                      {val ? <span>{val}</span> : null}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="opponent-telemetry-radar-stage">
          <div className="radar-pulse-ring ring-1" />
          <div className="radar-pulse-ring ring-2" />
          <div className="radar-center-icon">
            <Activity size={36} className="radar-activity-icon" />
            <span className="radar-label">ACTIVE STREAM</span>
          </div>
        </div>
      )}

      {/* ── Elimination Overlay ── */}
      {isEliminated && (
        <div className="opponent-eliminated-scrim fade-in">
          <Skull size={44} className="scrim-skull" />
          <span className="scrim-title">ELIMINATED</span>
          <span className="scrim-score">FINAL SCORE: {oppScore}</span>
        </div>
      )}

      {/* ── Winner Overlay ── */}
      {isWinner && (
        <div className="opponent-winner-scrim fade-in">
          <Crown size={48} className="scrim-crown" />
          <span className="scrim-title-win">WINNER!</span>
          <span className="scrim-score">FINAL SCORE: {oppScore}</span>
        </div>
      )}
    </div>
  );
}

/**
 * GameSplitArena
 * Real-time Split Screen Arena for 2 to 3 players.
 */
export default function GameSplitArena({
  game,
  localViewportRef,
  currentUsername = 'You',
  localScore = 0,
  localOver = false,
  localWon = false,
  opponents = [], // [{ id, username, score, grid, over, won }]
  onPlayAgain,
  onBackToArcade
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [matchOver, setMatchOver] = useState(false);
  const [winnerName, setWinnerName] = useState(null);

  // Format Elapsed Time MM:SS
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`;
  };

  // Match Timer loop
  useEffect(() => {
    if (matchOver) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [matchOver]);

  // Determine Win/Loss outcomes based on objective win, elimination, and relative scores
  useEffect(() => {
    if (matchOver) return;

    // Rule 1: Immediate victory if someone wins the game objective (e.g. 2048 tile reached)
    if (localWon) {
      setMatchOver(true);
      setWinnerName(currentUsername);
      return;
    }

    const winningOpponent = opponents.find((opp) => opp.won);
    if (winningOpponent) {
      setMatchOver(true);
      setWinnerName(winningOpponent.username || 'Opponent');
      return;
    }

    // Rule 2: If local player is eliminated, check if all or single surviving opponent
    if (localOver && opponents.length > 0) {
      const survivingOpponents = opponents.filter((opp) => !opp.over);
      if (survivingOpponents.length === 1) {
        setMatchOver(true);
        setWinnerName(survivingOpponents[0].username || 'Opponent');
      } else if (survivingOpponents.length === 0) {
        const all = [
          { name: currentUsername, score: localScore },
          ...opponents.map((o) => ({ name: o.username, score: o.score || 0 }))
        ];
        all.sort((a, b) => b.score - a.score);
        setMatchOver(true);
        setWinnerName(all[0].name);
      }
      return;
    }

    // Rule 3: If all opponents lost, local player wins
    if (opponents.length > 0 && opponents.every((opp) => opp.over) && !localOver) {
      setMatchOver(true);
      setWinnerName(currentUsername);
    }
  }, [localOver, localWon, localScore, opponents, matchOver, currentUsername]);

  const totalPanes = 1 + opponents.length;
  const isLocalWinner = winnerName === currentUsername;

  return (
    <div className={`game-split-arena total-panes-${totalPanes}`}>
      {/* ── Global Match Status Banner ── */}
      <div className="arena-top-ticker">
        <div className="ticker-badge">
          <Swords size={14} className="ticker-sword" />
          <span>DUEL ARENA: {game?.title?.toUpperCase() || 'ARCADE'}</span>
        </div>
        <div className="ticker-timer">
          <Clock size={13} />
          <span>MATCH TIME: {formatTime(elapsedSeconds)}</span>
        </div>
        <div className="ticker-players">
          <span className="live-dot" />
          <span>{totalPanes} PLAYERS LIVE</span>
        </div>
      </div>

      {/* ── Split Grid Columns ── */}
      <div className="arena-grid-stage">
        {/* PANE 1: LOCAL PLAYER */}
        <div className={`split-pane pane-local ${localOver ? 'is-eliminated' : ''} ${isLocalWinner && matchOver ? 'is-winner' : ''}`}>
          {/* Header Strip */}
          <div className="pane-header-strip">
            <div className="player-meta-info">
              <span className="player-avatar-pill">👑</span>
              <span className="player-name-text">{currentUsername} (You)</span>
            </div>
            <div className="player-score-box">
              <span className="score-label">YOUR SCORE</span>
              <span className="score-value">{localScore.toLocaleString()}</span>
            </div>
            <div className={`pane-status-pill ${localOver ? 'status-lost' : isLocalWinner && matchOver ? 'status-won' : 'status-live'}`}>
              {localOver ? 'ELIMINATED' : isLocalWinner && matchOver ? 'VICTORY' : 'PLAYING'}
            </div>
          </div>

          {/* Game Viewport Mount Slot */}
          <div className="pane-game-body">
            <div className="local-iframe-container" ref={localViewportRef} />

            {localOver && (
              <div className="pane-eliminated-scrim fade-in">
                <Skull size={44} className="scrim-skull" />
                <span className="scrim-title">YOU WERE ELIMINATED!</span>
                <span className="scrim-score">FINAL SCORE: {localScore}</span>
              </div>
            )}

            {isLocalWinner && matchOver && (
              <div className="pane-winner-scrim fade-in">
                <Crown size={48} className="scrim-crown" />
                <span className="scrim-title-win">VICTORY!</span>
                <span className="scrim-score">SCORE: {localScore}</span>
              </div>
            )}
          </div>
        </div>

        {/* PANE 2 & 3: OPPONENTS */}
        {opponents.map((opp, idx) => {
          const isOppWinner = winnerName === opp.username;
          return (
            <div
              key={opp.id || idx}
              className={`split-pane pane-opponent ${opp.over ? 'is-eliminated' : ''} ${isOppWinner && matchOver ? 'is-winner' : ''}`}
            >
              {/* Header Strip */}
              <div className="pane-header-strip">
                <div className="player-meta-info">
                  <span className="player-avatar-pill">⚡</span>
                  <span className="player-name-text">{opp.username || `Player ${idx + 2}`}</span>
                </div>
                <div className="player-score-box">
                  <span className="score-label">OPPONENT SCORE</span>
                  <span className="score-value">{(opp.score || 0).toLocaleString()}</span>
                </div>
                <div className={`pane-status-pill ${opp.over ? 'status-lost' : isOppWinner && matchOver ? 'status-won' : 'status-live'}`}>
                  {opp.over ? 'ELIMINATED' : isOppWinner && matchOver ? 'VICTOR' : 'PLAYING'}
                </div>
              </div>

              {/* Generic Opponent Stage */}
              <div className="pane-game-body">
                <GenericOpponentStage
                  game={game}
                  opponent={opp}
                  localScore={localScore}
                  isEliminated={Boolean(opp.over)}
                  isWinner={isOppWinner && matchOver}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Match Victory Announcement Overlay ── */}
      {matchOver && (
        <div className="arena-victory-overlay fade-in">
          <div className="victory-modal-card">
            <div className="victory-trophy-circle">
              <Trophy size={48} className="trophy-gold" />
            </div>
            <h2 className="victory-headline">
              {isLocalWinner ? '🎉 VICTORY! YOU WON!' : `⚔️ ${winnerName} WON THE DUEL!`}
            </h2>
            <p className="victory-subtitle">
              Match completed in <strong>{formatTime(elapsedSeconds)}</strong>.
            </p>

            <div className="victory-scoreboard">
              <div className={`score-row ${isLocalWinner ? 'is-top' : ''}`}>
                <span className="row-rank">{isLocalWinner ? '🥇 1st' : '🥈 2nd'}</span>
                <span className="row-name">{currentUsername} (You)</span>
                <span className="row-pts">{localScore} PTS</span>
              </div>
              {opponents.map((opp, idx) => {
                const oppWon = winnerName === opp.username;
                return (
                  <div key={opp.id || idx} className={`score-row ${oppWon ? 'is-top' : ''}`}>
                    <span className="row-rank">{oppWon ? '🥇 1st' : '🥈 2nd'}</span>
                    <span className="row-name">{opp.username || `Opponent`}</span>
                    <span className="row-pts">{opp.score || 0} PTS</span>
                  </div>
                );
              })}
            </div>

            <div className="victory-actions-deck">
              <CoGetherButton variant="primary" onClick={onPlayAgain} icon={RotateCw}>
                REMATCH NOW
              </CoGetherButton>
              <CoGetherButton variant="secondary" onClick={onBackToArcade} icon={ArrowLeft}>
                BACK TO ARCADE
              </CoGetherButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
