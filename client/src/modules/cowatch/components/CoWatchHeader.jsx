import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, Users, Link2, MoreHorizontal, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../../core/AuthContext.jsx';

export default function CoWatchHeader({
  searchQuery,
  onSearchChange,
  onCreateRoom,
  onJoinRoom,
  onOpenImportModal,
  onOpenProfile,
  onOpenAuth
}) {
  const { isAuthenticated, profile, user } = useAuth();
  const displayName = profile?.displayName || profile?.username || user?.email?.split('@')[0] || 'Member';
  const [showUtilityMenu, setShowUtilityMenu] = useState(false);
  const menuRef = useRef(null);

  // Close utility menu on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUtilityMenu(false);
      }
    }
    if (showUtilityMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUtilityMenu]);

  return (
    <header className="cowatch-header-root">
      {/* ── LEFT: BREADCRUMB CONTEXT ── */}
      <div className="cowatch-header-left">
        <div className="cowatch-header-breadcrumb">
          <span className="breadcrumb-brand">CoWatch</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Cinema Hub</span>
        </div>
      </div>

      {/* ── CENTER: QUIET SEARCH BAR ── */}
      <div className="cowatch-header-center">
        <div className="cowatch-search-box">
          <Search size={15} className="cowatch-search-icon" />
          <input
            type="text"
            placeholder="Search titles, genres, providers..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="cowatch-search-clear"
              onClick={() => onSearchChange('')}
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* ── RIGHT: ACTIONS & PROFILE ── */}
      <div className="cowatch-header-right">
        {/* Primary Action: New Party */}
        <button
          type="button"
          className="btn-cowatch-create-room"
          onClick={onCreateRoom}
          title="Create a new watch party"
        >
          <Plus size={14} />
          <span>New Party</span>
        </button>

        {/* Secondary Actions Utility Dropdown */}
        <div className="cowatch-header-menu-container" ref={menuRef}>
          <button
            type="button"
            className="btn-cowatch-utility-toggle"
            onClick={() => setShowUtilityMenu((prev) => !prev)}
            title="More room actions"
            aria-label="More actions"
          >
            <MoreHorizontal size={16} />
          </button>

          {showUtilityMenu && (
            <div className="cowatch-utility-dropdown">
              <button
                type="button"
                className="cowatch-utility-menu-item"
                onClick={() => {
                  setShowUtilityMenu(false);
                  onJoinRoom();
                }}
              >
                <Users size={14} />
                <span>Join by Room Code</span>
              </button>
              <button
                type="button"
                className="cowatch-utility-menu-item"
                onClick={() => {
                  setShowUtilityMenu(false);
                  onOpenImportModal();
                }}
              >
                <Link2 size={14} />
                <span>Import Stream URL</span>
              </button>
            </div>
          )}
        </div>

        {/* User Profile Avatar / Sign In */}
        {isAuthenticated ? (
          <button
            type="button"
            className="cowatch-header-avatar-btn"
            onClick={onOpenProfile}
            title={`${displayName} — Profile`}
          >
            <div className="cowatch-avatar-circle">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <span className="cowatch-avatar-status-dot" />
          </button>
        ) : (
          <button
            type="button"
            className="btn-cowatch-signin"
            onClick={onOpenAuth}
          >
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}
