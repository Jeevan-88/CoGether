import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, Users, Link2, MoreHorizontal } from 'lucide-react';
import { useAuth } from '../../../core/AuthContext.jsx';
import { useSocial } from '../../../core/SocialContext.jsx';
import AppNavShell from '../../../components/common/AppNavShell.jsx';

export default function CoWatchHeader({
  searchQuery,
  onSearchChange,
  onCreateRoom,
  onJoinRoom,
  onOpenImportModal,
  onOpenProfile,
  onOpenAuth,
  onSelectService,
  onBackToHome
}) {
  const { profile, user } = useAuth();
  const { unreadSummary, pendingRequests, setIsSocialModalOpen } = useSocial();
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
    <AppNavShell
      activeService="cowatch"
      onSelectService={onSelectService}
      onBackToHome={onBackToHome}
      user={user}
      profile={profile}
      onOpenProfile={onOpenProfile}
      onOpenSocial={() => setIsSocialModalOpen(true)}
      onOpenAuth={onOpenAuth}
      unreadCount={unreadSummary?.totalUnread || 0}
      pendingCount={pendingRequests?.incoming?.length || 0}
      centerContent={
        <div className="cowatch-search-box" style={{ maxWidth: '380px', width: '100%' }}>
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
      }
      rightActions={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn-cowatch-create-room"
            onClick={onCreateRoom}
            title="Create a new watch party"
          >
            <Plus size={14} />
            <span>New Party</span>
          </button>

          <div className="cowatch-header-menu-container" ref={menuRef} style={{ position: 'relative' }}>
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
        </div>
      }
    />
  );
}
