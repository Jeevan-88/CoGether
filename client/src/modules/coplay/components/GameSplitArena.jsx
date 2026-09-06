import React, { useState, useEffect, useRef } from 'react';
import { Swords, Trophy, Clock, Skull, Zap, RotateCw, ArrowLeft, Crown } from 'lucide-react';
import CoGetherButton from './CoGetherButton.jsx';
import './GameSplitArena.css';

/**
 * 2048 Board Renderer for opponent split screen
 */
function Opponent2048Board({ grid = [], score = 0, isEliminated = false, isWinner = false }) {
  // 4x4 fallback empty grid
  const cells = grid && grid.length === 4 ? grid : [
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null]
  ];

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
    <div className="opponent-game-stage">
      <div className="opponent-grid-2048">
        {cells.map((col, x) => (
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

      {isEliminated && (
        <div className="opponent-eliminated-scrim fade-in">
          <Skull size={40} className="scrim-skull" />
          <span className="scrim-title">ELIMINATED</span>
          <span className="scrim-score">FINAL: {score}</span>
        </div>
      )}

      {isWinner && (
        <div className="opponent-winner-scrim fade-in">
          <Crown size={42} className="scrim-crown" />
          <span className="scrim-title-win">WINNER!</span>
          <span className="scrim-score">FINAL: {score}</span>
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

  // Determine Win/Loss outcomes
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

    // Rule 2: If local player loses, and opponents exist
    if (localOver && opponents.length > 0) {
      // Find surviving opponents
      const survivingOpponents = opponents.filter((opp) => !opp.over);
      if (survivingOpponents.length === 1) {
        // Last player standing wins!
        setMatchOver(true);
        setWinnerName(survivingOpponents[0].username || 'Opponent');
      } else if (survivingOpponents.length === 0) {
        // All eliminated, highest score wins
        const all = [{ name: currentUsername, score: localScore }, ...opponents.map((o) => ({ name: o.username, score: o.score || 0 }))];
        all.sort((a, b) => b.score - a.score);
        setMatchOver(true);
        setWinnerName(all[0].name);
      }
      return;
    }

    // Rule 3: If all opponents lost, local player is last standing and wins!
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
          <Swords size={13} />
          <span>SPLIT-SCREEN DUEL ARENA</span>
        </div>
        <div className="ticker-timer">
          <Clock size={13} />
          <span>MATCH TIME: {formatTime(elapsedSeconds)}</span>
        </div>
        <div className="ticker-players">
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
              <span className="score-label">SCORE</span>
              <span className="score-value">{localScore}</span>
            </div>
            <div className={`pane-status-pill ${localOver ? 'status-lost' : isLocalWinner && matchOver ? 'status-won' : 'status-live'}`}>
              {localOver ? 'OUT' : isLocalWinner && matchOver ? 'WINNER' : 'PLAYING'}
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

        {/* PANE 2 & 3: OPPONENT PLAYERS */}
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
                  <span className="score-label">SCORE</span>
                  <span className="score-value">{opp.score || 0}</span>
                </div>
                <div className={`pane-status-pill ${opp.over ? 'status-lost' : isOppWinner && matchOver ? 'status-won' : 'status-live'}`}>
                  {opp.over ? 'OUT' : isOppWinner && matchOver ? 'WINNER' : 'PLAYING'}
                </div>
              </div>

              {/* Opponent Live Board View */}
              <div className="pane-game-body">
                <Opponent2048Board
                  grid={opp.grid}
                  score={opp.score || 0}
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
