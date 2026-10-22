import React, { useState, useEffect } from 'react';
import {
  Swords, Copy, Check, Users, X, Send,
  KeyRound, Loader2, ArrowRight
} from 'lucide-react';
import { useSocial } from '../../../core/SocialContext';
import CogetherAvatarRenderer from '../../auth/CogetherAvatarRenderer';
import './PlayWithFriendModal.css';

export default function PlayWithFriendModal({ game, onClose, onJoinRoom }) {
  const { friends, createPrivateRoom, inviteFriendToRoom } = useSocial();
  const [activeTab, setActiveTab] = useState('invite'); // 'invite' | 'join'
  const [room, setRoom] = useState(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [copied, setCopied] = useState(false);
  const [invitedFriends, setInvitedFriends] = useState(new Set());
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinError, setJoinError] = useState('');

  // Create private room on mount
  useEffect(() => {
    let mounted = true;
    const initRoom = async () => {
      setIsCreatingRoom(true);
      try {
        const gameId = game?.id || '2048';
        const newRoom = await createPrivateRoom(gameId);
        if (mounted && newRoom) {
          setRoom(newRoom);
        }
      } catch (err) {
        console.error('Failed to create private room', err);
      } finally {
        if (mounted) setIsCreatingRoom(false);
      }
    };
    initRoom();
    return () => { mounted = false; };
  }, [game?.id, createPrivateRoom]);

  const handleCopyCode = () => {
    if (!room?.room_code) return;
    navigator.clipboard.writeText(room.room_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    if (!room?.room_code) return;
    const url = `${window.location.origin}?service=games&room=${encodeURIComponent(room.room_code)}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInviteFriend = async (friendId) => {
    if (!room || invitedFriends.has(friendId)) return;
    try {
      setInvitedFriends(prev => new Set(prev).add(friendId));
      await inviteFriendToRoom(friendId, room.id, game?.id || '2048');
    } catch (err) {
      console.error('Failed to invite friend', err);
      setInvitedFriends(prev => {
        const next = new Set(prev);
        next.delete(friendId);
        return next;
      });
    }
  };

  const handleJoinByCode = (e) => {
    e.preventDefault();
    const cleanCode = joinCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      setJoinError('Please enter a valid room code');
      return;
    }
    if (typeof onJoinRoom === 'function') {
      onJoinRoom(cleanCode);
    }
  };

  const handleLaunchHostRoom = () => {
    if (room && typeof onJoinRoom === 'function') {
      onJoinRoom(room.room_code);
    }
  };

  return (
    <div className="friend-modal-overlay fade-in" onClick={onClose}>
      <div className="friend-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="friend-modal-header">
          <div className="friend-header-left">
            <Swords size={18} className="header-swords" />
            <div className="header-text">
              <h3>Play with a Friend</h3>
              <span>{game?.title || 'Arcade Game'}</span>
            </div>
          </div>
          <button type="button" className="btn-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Tab switch: Invite Friend vs Join with Code */}
        <div className="modal-tab-bar">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'invite' ? 'active' : ''}`}
            onClick={() => setActiveTab('invite')}
          >
            Create & Invite
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'join' ? 'active' : ''}`}
            onClick={() => setActiveTab('join')}
          >
            Join with Code
          </button>
        </div>

        {/* Body */}
        <div className="friend-modal-body">
          {activeTab === 'invite' ? (
            <>
              {/* Room Code Badge & Copy */}
              <div className="room-code-section">
                <span className="room-code-label">Private Room Code</span>
                <div className="room-code-display-box">
                  {isCreatingRoom ? (
                    <div className="code-loading">
                      <Loader2 size={16} className="spin" />
                      <span>Generating secure room...</span>
                    </div>
                  ) : (
                    <>
                      <span className="room-code-text">{room?.room_code || 'DUEL-WAIT'}</span>
                      <div className="room-code-buttons">
                        <button
                          type="button"
                          className="btn-copy-code"
                          onClick={handleCopyCode}
                          title="Copy Code"
                        >
                          {copied ? <Check size={14} className="copied" /> : <Copy size={14} />}
                          <span>{copied ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button
                          type="button"
                          className="btn-copy-link"
                          onClick={handleCopyLink}
                          title="Copy full invite link"
                        >
                          Copy Link
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Friends Selector List */}
              <div className="friend-selector-section">
                <span className="section-title">Invite from Friends ({friends.length})</span>
                {friends.length === 0 ? (
                  <div className="no-friends-notice">
                    <Users size={24} />
                    <p>You don't have any friends added yet.</p>
                    <span>Share the room code or link above directly with anyone to play together!</span>
                  </div>
                ) : (
                  <div className="friends-invite-list">
                    {friends.map((friend) => {
                      const isInvited = invitedFriends.has(friend.id);
                      return (
                        <div key={friend.id} className="friend-invite-row">
                          <div className="invite-row-left">
                            <div className="invite-avatar">
                              {friend.avatarConfig ? (
                                <CogetherAvatarRenderer config={friend.avatarConfig} size={32} animated={false} />
                              ) : friend.avatarUrl ? (
                                <img src={friend.avatarUrl} alt="" className="invite-avatar-img" />
                              ) : (
                                <span>{(friend.displayName || friend.username || 'F')[0].toUpperCase()}</span>
                              )}
                              <span className={`presence-pip ${friend.online ? 'online' : 'offline'}`} />
                            </div>
                            <div className="invite-details">
                              <span className="name">{friend.displayName || friend.username}</span>
                              <span className="status">{friend.online ? 'Online' : 'Offline'}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={isInvited || !room}
                            className={`btn-friend-invite ${isInvited ? 'invited' : ''}`}
                            onClick={() => handleInviteFriend(friend.id)}
                          >
                            {isInvited ? (
                              <>
                                <Check size={13} />
                                <span>Invited</span>
                              </>
                            ) : (
                              <>
                                <Send size={13} />
                                <span>Invite</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Enter Stage Button */}
              <div className="modal-footer-cta">
                <button
                  type="button"
                  className="btn-enter-room-host"
                  disabled={!room}
                  onClick={handleLaunchHostRoom}
                >
                  <span>Enter Room Now</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </>
          ) : (
            /* Join with code */
            <form onSubmit={handleJoinByCode} className="join-code-section">
              <div className="join-icon-circle">
                <KeyRound size={28} />
              </div>
              <h4>Enter Duel Room Code</h4>
              <p>Paste the room code provided by your friend to jump straight into their game arena.</p>

              <div className="join-input-group">
                <input
                  type="text"
                  placeholder="e.g. DUEL-4A8F2B"
                  value={joinCodeInput}
                  onChange={(e) => {
                    setJoinCodeInput(e.target.value);
                    setJoinError('');
                  }}
                  className="join-code-input"
                  autoFocus
                />
                <button type="submit" className="btn-join-submit" disabled={!joinCodeInput.trim()}>
                  <span>Join</span>
                  <ArrowRight size={15} />
                </button>
              </div>
              {joinError && <div className="join-error-msg">{joinError}</div>}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
