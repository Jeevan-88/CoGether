import React from 'react';
import { Search, SlidersHorizontal, Bell, Users, X, Link2, Play } from 'lucide-react';
import './CoWatchHeader.css';

export default function CoWatchHeader({
  searchQuery = '',
  onSearchChange,
  onCreateRoom,
  onOpenFilter,
  onOpenNotifications,
  onOpenPasteLink,
  onLaunchStreamUrl
}) {
  const isUrl = searchQuery.trim().startsWith('http://') || 
                searchQuery.trim().startsWith('https://') || 
                searchQuery.trim().includes('youtu.be/') || 
                searchQuery.trim().includes('youtube.com/');

  return (
    <header className="cowatch-header-target" aria-label="CoWatch Top Toolbar">
      {/* ── 1. Centered Wide Search & Paste Link Pill ── */}
      <div className="cowatch-search-container">
        <div className={`cowatch-search-pill cowatch-search-box ${isUrl ? 'has-detected-url' : ''}`}>
          <Search size={16} className="cowatch-search-icon" />
          <input
            type="text"
            className="cowatch-search-input"
            placeholder="Search movies, series, anime, or paste YouTube / MP4 stream link..."
            value={searchQuery}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isUrl && onLaunchStreamUrl) {
                onLaunchStreamUrl(searchQuery);
              }
            }}
          />
          {isUrl && onLaunchStreamUrl && (
            <button
              type="button"
              className="cowatch-stream-url-pill-btn"
              onClick={() => onLaunchStreamUrl(searchQuery)}
              title="Launch instant watch party with this link"
            >
              <Play size={12} fill="currentColor" />
              <span>Stream Link</span>
            </button>
          )}
          {searchQuery && (
            <button
              type="button"
              className="cowatch-search-clear-btn"
              onClick={() => onSearchChange && onSearchChange('')}
              title="Clear search"
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* ── 2. Right Toolbar Action Controls ── */}
      <div className="cowatch-header-actions">
        {/* Paste Link Button */}
        <button
          type="button"
          className="btn-cowatch-paste-link"
          onClick={onOpenPasteLink}
          title="Paste any video file (.mp4, .m3u8) or YouTube URL"
        >
          <Link2 size={15} />
          <span>Paste Link</span>
        </button>

        {/* Filter Button */}
        <button
          type="button"
          className="btn-cowatch-filter"
          onClick={onOpenFilter}
          title="Filter content by genre and quality"
        >
          <SlidersHorizontal size={15} />
          <span>Filter</span>
        </button>

        {/* Notifications Bell */}
        <button
          type="button"
          className="btn-cowatch-bell"
          onClick={onOpenNotifications}
          title="Notifications & Invites"
          aria-label="Notifications & Invites"
        >
          <Bell size={17} />
          <span className="bell-badge-peach" />
        </button>

        {/* New Party Crimson Button */}
        <button
          type="button"
          className="btn-cowatch-new-party btn-cowatch-create-room"
          onClick={onCreateRoom}
          title="Create a new synchronized watch party"
        >
          <Users size={16} />
          <span>New Party</span>
        </button>
      </div>
    </header>
  );
}
