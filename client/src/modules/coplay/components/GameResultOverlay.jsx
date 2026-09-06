import React from 'react';
import { Trophy, RotateCw, ArrowLeft, Swords, Award } from 'lucide-react';
import CoGetherButton from './CoGetherButton.jsx';
import './GameResultOverlay.css';

/**
 * GameResultOverlay
 * Compact post-game overlay card for both single player and challenge duels.
 * Never covers the entire viewport unnecessarily.
 */
export default function GameResultOverlay({
  isChallenge = false,
  playerName = 'You',
  peerName = 'Friend',
  playerScore = null,
  peerScore = null,
  winner = null,
  onPlayAgain,
  onBackToArcade
}) {
  return (
    <div className="game-result-overlay-scrim fade-in">
      <div className="game-result-card">
        <div className="result-header">
          <div className="result-badge">
            {isChallenge ? <Swords size={16} /> : <Trophy size={16} />}
            <span>{isChallenge ? 'CHALLENGE FINISHED' : 'GAME FINISHED'}</span>
          </div>
          <h3 className="result-title">{isChallenge ? 'DUEL COMPLETE' : 'GOOD GAME!'}</h3>
        </div>

        {isChallenge ? (
          <div className="challenge-scores-comparison">
            <div className={`score-card ${winner === playerName ? 'winner-card' : ''}`}>
              <span className="score-user-label">{playerName}</span>
              <span className="score-number">{playerScore !== null ? playerScore : 'COMPLETED'}</span>
              {winner === playerName && (
                <div className="winner-tag">
                  <Award size={12} />
                  <span>WINNER</span>
                </div>
              )}
            </div>

            <div className="score-vs-divider">VS</div>

            <div className={`score-card ${winner === peerName ? 'winner-card' : ''}`}>
              <span className="score-user-label">{peerName}</span>
              <span className="score-number">{peerScore !== null ? peerScore : 'COMPLETED'}</span>
              {winner === peerName && (
                <div className="winner-tag">
                  <Award size={12} />
                  <span>WINNER</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          playerScore !== null && (
            <div className="single-player-score-box">
              <span className="score-label">FINAL SCORE</span>
              <span className="score-big">{playerScore}</span>
            </div>
          )
        )}

        <div className="result-action-buttons">
          <CoGetherButton
            variant="primary"
            onClick={onPlayAgain}
            icon={RotateCw}
          >
            {isChallenge ? 'PLAY AGAIN' : 'TRY AGAIN'}
          </CoGetherButton>

          <CoGetherButton
            variant="secondary"
            onClick={onBackToArcade}
            icon={ArrowLeft}
          >
            {isChallenge ? 'EXIT CHALLENGE' : 'BACK TO ARCADE'}
          </CoGetherButton>
        </div>
      </div>
    </div>
  );
}
