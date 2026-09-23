import React, { useState, useEffect } from 'react';
import { Trophy, X, Calendar, Flame, ShieldAlert, Award, Loader2, Clock } from 'lucide-react';
import { API_URL } from '../../../config/api.js';
import './LeaderboardModal.css';

const API_BASE = API_URL;

export default function LeaderboardModal({ game, onClose }) {
  const [period, setPeriod] = useState('all_time');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({ entries: [] });

  useEffect(() => {
    if (!game?.id) return;
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`${API_BASE}/api/v1/coplay/leaderboards/${game.id}?period=${period}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((resData) => {
        if (isMounted) {
          setData(resData);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to load leaderboard');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [game?.id, period]);

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="leaderboard-modal-backdrop fade-in" onClick={onClose}>
      <div className="leaderboard-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="leaderboard-header">
          <div className="leaderboard-title-group">
            <div className="trophy-icon-wrap">
              <Trophy size={20} className="trophy-gold" />
            </div>
            <div>
              <h2 className="leaderboard-game-title">{game?.title || 'Game'} Leaderboard</h2>
              <span className="leaderboard-subtitle">Verified Hall of Fame</span>
            </div>
          </div>

          <button className="leaderboard-close-btn" onClick={onClose} aria-label="Close leaderboard">
            <X size={18} />
          </button>
        </div>

        {/* Period Selector Tabs */}
        <div className="leaderboard-tab-row">
          <button
            className={`leaderboard-tab ${period === 'all_time' ? 'active' : ''}`}
            onClick={() => setPeriod('all_time')}
          >
            <Flame size={14} />
            <span>ALL-TIME</span>
          </button>
          <button
            className={`leaderboard-tab ${period === 'weekly' ? 'active' : ''}`}
            onClick={() => setPeriod('weekly')}
          >
            <Calendar size={14} />
            <span>THIS WEEK</span>
          </button>
          <button
            className={`leaderboard-tab ${period === 'daily' ? 'active' : ''}`}
            onClick={() => setPeriod('daily')}
          >
            <Clock size={14} />
            <span>TODAY</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="leaderboard-body">
          {loading && (
            <div className="leaderboard-loading">
              <Loader2 size={32} className="spinning-loader" />
              <span>FETCHING LEADERBOARD SCORES...</span>
            </div>
          )}

          {error && !loading && (
            <div className="leaderboard-error">
              <ShieldAlert size={28} />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && data.entries.length === 0 && (
            <div className="leaderboard-empty">
              <Award size={36} className="empty-trophy" />
              <p className="empty-title">NO HIGH SCORES RECORDED YET</p>
              <p className="empty-desc">Be the first player to challenge a friend and set a record!</p>
            </div>
          )}

          {!loading && !error && data.entries.length > 0 && (
            <div className="leaderboard-list">
              {data.entries.map((entry) => {
                const isTop1 = entry.rank === 1;
                const isTop2 = entry.rank === 2;
                const isTop3 = entry.rank === 3;
                const rankClass = isTop1 ? 'rank-1' : isTop2 ? 'rank-2' : isTop3 ? 'rank-3' : '';

                return (
                  <div key={`${entry.rank}-${entry.createdAt}`} className={`leaderboard-row ${rankClass}`}>
                    <div className="row-left-cell">
                      <span className="rank-badge">
                        {isTop1 ? '🥇' : isTop2 ? '🥈' : isTop3 ? '🥉' : `#${entry.rank}`}
                      </span>
                      <div className="player-avatar-wrap">
                        {entry.avatarUrl ? (
                          <img src={entry.avatarUrl} alt={entry.displayName} className="player-avatar-img" />
                        ) : (
                          <div className="player-avatar-fallback">
                            {entry.displayName.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="player-names">
                        <span className="player-display-name">{entry.displayName}</span>
                        <span className="player-username">@{entry.username}</span>
                      </div>
                    </div>

                    <div className="row-right-cell">
                      <div className="score-display">
                        <span className="score-number">{entry.score.toLocaleString()}</span>
                        <span className="score-pts">PTS</span>
                      </div>
                      <div className="verification-badge-row">
                        <span className="badge-range-bound" title="Client-reported score validated by range and schema">
                          RANGE BOUND
                        </span>
                        <span className="score-date">{formatDate(entry.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
