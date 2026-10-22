import React, { useState, useEffect, useRef } from 'react';
import {
  Users, UserPlus, MessageSquare, Shield, X, Send,
  Swords, Check, Search, Circle, Clock, CheckCheck,
  UserX, Ban, ChevronLeft, Loader2
} from 'lucide-react';
import { useSocial } from '../../core/SocialContext';
import { useAuth } from '../../core/AuthContext';
import CogetherAvatarRenderer from '../auth/CogetherAvatarRenderer';
import './FriendsModal.css';

export default function FriendsModal({ onClose, onLaunchGameDuel }) {
  const { user } = useAuth();
  const {
    friends,
    pendingRequests,
    unreadSummary,
    activeFriend,
    activeMessages,
    isMessagesLoading,
    typingStatus,
    socialModalTab,
    setSocialModalTab,
    openDirectMessage,
    closeDirectMessage,
    sendDirectMessage,
    sendTypingIndicator,
    sendFriendRequest,
    respondFriendRequest,
    cancelFriendRequest,
    removeFriend,
    blockUser,
    searchUsers
  } = useSocial();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState(null);
  const [msgInput, setMsgInput] = useState('');
  const [isSendingMsg, setIsSendingMsg] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto-scroll messages when new ones arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages]);

  // Handle user search
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchUsers(searchQuery);
        setSearchResults(results);
      } catch (err) {
        console.warn('Search failed', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  // Handle sending friend request
  const handleSendRequest = async (targetHandle) => {
    try {
      setSearchFeedback(null);
      const res = await sendFriendRequest(targetHandle);
      if (res.success) {
        setSearchFeedback({ type: 'success', text: `Friend request sent to ${targetHandle}` });
      } else {
        setSearchFeedback({ type: 'error', text: res.message || 'Could not send friend request' });
      }
    } catch (err) {
      setSearchFeedback({ type: 'error', text: err.message || 'Failed to send friend request' });
    }
  };

  // Handle typing indicator emission
  const handleInputChange = (e) => {
    const val = e.target.value;
    setMsgInput(val);
    if (!activeFriend) return;

    sendTypingIndicator(activeFriend.id, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(activeFriend.id, false);
    }, 1500);
  };

  // Handle send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!msgInput.trim() || !activeFriend || isSendingMsg) return;

    const text = msgInput.trim();
    setMsgInput('');
    setIsSendingMsg(true);
    sendTypingIndicator(activeFriend.id, false);

    try {
      await sendDirectMessage(activeFriend.id, text);
    } catch (err) {
      console.error('Failed to send message', err);
    } finally {
      setIsSendingMsg(false);
    }
  };

  const isFriendOnline = (friendId) => {
    const f = friends.find(item => item.id === friendId);
    return !!f?.online;
  };

  return (
    <div className="social-modal-overlay fade-in" onClick={onClose}>
      <div className="social-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Top Header */}
        <div className="social-modal-header">
          <div className="social-header-title-group">
            {activeFriend ? (
              <button
                type="button"
                className="btn-back-to-list"
                onClick={closeDirectMessage}
                title="Back to Friends"
              >
                <ChevronLeft size={16} />
                <span>Friends</span>
              </button>
            ) : (
              <div className="social-main-title">
                <Users size={18} className="title-icon" />
                <span>Friends & Messages</span>
              </div>
            )}
          </div>

          {!activeFriend && (
            <div className="social-nav-tabs">
              <button
                type="button"
                className={`social-tab-btn ${socialModalTab === 'friends' ? 'active' : ''}`}
                onClick={() => setSocialModalTab('friends')}
              >
                Friends ({friends.length})
              </button>
              <button
                type="button"
                className={`social-tab-btn ${socialModalTab === 'search' ? 'active' : ''}`}
                onClick={() => setSocialModalTab('search')}
              >
                Add Friends
              </button>
              <button
                type="button"
                className={`social-tab-btn ${socialModalTab === 'requests' ? 'active' : ''}`}
                onClick={() => setSocialModalTab('requests')}
              >
                Requests
                {pendingRequests.incoming.length > 0 && (
                  <span className="tab-badge">{pendingRequests.incoming.length}</span>
                )}
              </button>
            </div>
          )}

          <button type="button" className="btn-social-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="social-modal-body">
          {/* ── VIEW 1: DIRECT MESSAGES (E2EE) ── */}
          {activeFriend ? (
            <div className="dm-view-container">
              {/* DM Top Info Bar */}
              <div className="dm-info-bar">
                <div className="dm-user-meta">
                  <div className="dm-avatar-wrapper">
                    {activeFriend.avatarConfig ? (
                      <CogetherAvatarRenderer config={activeFriend.avatarConfig} size={38} animated={false} />
                    ) : activeFriend.avatarUrl ? (
                      <img src={activeFriend.avatarUrl} alt="" className="dm-avatar-img" />
                    ) : (
                      <div className="dm-avatar-placeholder">
                        {(activeFriend.displayName || activeFriend.username || 'F')[0].toUpperCase()}
                      </div>
                    )}
                    <span className={`dm-presence-dot ${isFriendOnline(activeFriend.id) ? 'online' : 'offline'}`} />
                  </div>
                  <div className="dm-names">
                    <span className="dm-display-name">{activeFriend.displayName || activeFriend.username}</span>
                    <span className="dm-handle">@{activeFriend.username} · {isFriendOnline(activeFriend.id) ? 'Online' : 'Offline'}</span>
                  </div>
                </div>

                <div className="dm-top-actions">
                  <div className="e2ee-badge" title="SubtleCrypto ECDH P-256 + AES-GCM 256. Zero plaintext on server.">
                    <Shield size={12} />
                    <span>E2EE Secure</span>
                  </div>
                  {onLaunchGameDuel && (
                    <button
                      type="button"
                      className="btn-dm-duel"
                      onClick={() => onLaunchGameDuel(activeFriend)}
                      title="Challenge this friend to an arcade duel"
                    >
                      <Swords size={14} />
                      <span>Duel</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Messages Body */}
              <div className="dm-messages-stream">
                <div className="e2ee-encryption-notice">
                  <Shield size={14} className="notice-shield" />
                  <span>Messages in this chat are end-to-end encrypted with ECDH P-256 and AES-GCM. Plaintext and keys never touch the server.</span>
                </div>

                {isMessagesLoading ? (
                  <div className="dm-loading-spinner">
                    <Loader2 size={24} className="spin" />
                    <span>Decrypting message history...</span>
                  </div>
                ) : activeMessages.length === 0 ? (
                  <div className="dm-empty-state">
                    <p>No messages yet with {activeFriend.displayName || activeFriend.username}.</p>
                    <span>Say hello or invite them to a game duel!</span>
                  </div>
                ) : (
                  activeMessages.map((msg, idx) => {
                    const isMine = msg.sender_id === user?.id;
                    const timeStr = msg.created_at
                      ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '';
                    return (
                      <div key={msg.id || idx} className={`dm-bubble-row ${isMine ? 'mine' : 'theirs'}`}>
                        <div className="dm-bubble">
                          <div className="dm-text">{msg.plaintext || '[Ciphertext]'}</div>
                          <div className="dm-footer">
                            <span className="dm-time">{timeStr}</span>
                            {isMine && (
                              <span className="dm-read-status" title={msg.status === 'read' ? 'Read' : 'Delivered'}>
                                {msg.status === 'read' ? <CheckCheck size={12} className="read-icon" /> : <Check size={12} />}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {typingStatus[activeFriend.id] && (
                  <div className="dm-typing-indicator fade-in">
                    <span>{activeFriend.displayName || activeFriend.username} is typing...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Form */}
              <form onSubmit={handleSendMessage} className="dm-composer-bar">
                <input
                  type="text"
                  placeholder={`Message ${activeFriend.displayName || activeFriend.username}...`}
                  value={msgInput}
                  onChange={handleInputChange}
                  className="dm-input-field"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!msgInput.trim() || isSendingMsg}
                  className="btn-dm-send"
                  title="Send message"
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          ) : socialModalTab === 'friends' ? (
            /* ── VIEW 2: FRIENDS LIST ── */
            <div className="friends-list-container">
              {friends.length === 0 ? (
                <div className="friends-empty-placeholder">
                  <Users size={36} className="empty-icon" />
                  <h3>No friends yet</h3>
                  <p>Search for players by their @username to duel together and chat securely.</p>
                  <button
                    type="button"
                    className="btn-find-friends-cta"
                    onClick={() => setSocialModalTab('search')}
                  >
                    Find Friends
                  </button>
                </div>
              ) : (
                <div className="friends-cards-grid">
                  {friends.map((friend) => (
                    <div key={friend.id} className="friend-card-row">
                      <div className="friend-card-left">
                        <div className="friend-avatar-wrap">
                          {friend.avatarConfig ? (
                            <CogetherAvatarRenderer config={friend.avatarConfig} size={42} animated={false} />
                          ) : friend.avatarUrl ? (
                            <img src={friend.avatarUrl} alt="" className="friend-avatar-img" />
                          ) : (
                            <div className="friend-avatar-placeholder">
                              {(friend.displayName || friend.username || 'F')[0].toUpperCase()}
                            </div>
                          )}
                          <span className={`presence-indicator ${friend.online ? 'online' : 'offline'}`} />
                        </div>
                        <div className="friend-details">
                          <span className="friend-name">{friend.displayName || friend.username}</span>
                          <span className="friend-handle">
                            @{friend.username} · {friend.online ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </div>

                      <div className="friend-card-actions">
                        <button
                          type="button"
                          className="btn-friend-action btn-message"
                          onClick={() => openDirectMessage(friend)}
                          title="Open encrypted chat"
                        >
                          <MessageSquare size={14} />
                          <span>Chat</span>
                        </button>
                        {onLaunchGameDuel && (
                          <button
                            type="button"
                            className="btn-friend-action btn-duel"
                            onClick={() => onLaunchGameDuel(friend)}
                            title="Invite to game duel"
                          >
                            <Swords size={14} />
                            <span>Duel</span>
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn-friend-remove"
                          onClick={() => {
                            if (window.confirm(`Remove ${friend.displayName || friend.username} from friends?`)) {
                              removeFriend(friend.id);
                            }
                          }}
                          title="Remove Friend"
                        >
                          <UserX size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : socialModalTab === 'search' ? (
            /* ── VIEW 3: SEARCH USERS ── */
            <div className="search-users-container">
              <div className="search-input-box">
                <Search size={16} className="search-box-icon" />
                <input
                  type="text"
                  placeholder="Search by @username or display name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-user-input"
                  autoFocus
                />
              </div>

              {searchFeedback && (
                <div className={`search-feedback-banner ${searchFeedback.type}`}>
                  {searchFeedback.text}
                </div>
              )}

              <div className="search-results-list">
                {isSearching ? (
                  <div className="search-loading">
                    <Loader2 size={20} className="spin" />
                    <span>Searching members...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((target) => (
                    <div key={target.id} className="search-result-row">
                      <div className="search-result-left">
                        <div className="search-avatar-wrap">
                          {target.avatarConfig ? (
                            <CogetherAvatarRenderer config={target.avatarConfig} size={38} animated={false} />
                          ) : target.avatarUrl ? (
                            <img src={target.avatarUrl} alt="" className="search-avatar-img" />
                          ) : (
                            <div className="search-avatar-placeholder">
                              {(target.displayName || target.username || 'U')[0].toUpperCase()}
                            </div>
                          )}
                          <span className={`presence-indicator ${target.online ? 'online' : 'offline'}`} />
                        </div>
                        <div className="search-details">
                          <span className="search-name">{target.displayName || target.username}</span>
                          <span className="search-handle">@{target.username}</span>
                        </div>
                      </div>

                      <div className="search-result-actions">
                        {target.friendshipStatus === 'accepted' ? (
                          <span className="badge-friend-status">Friends</span>
                        ) : target.friendshipStatus === 'pending' ? (
                          <span className="badge-friend-status pending">Request Sent</span>
                        ) : (
                          <button
                            type="button"
                            className="btn-send-request"
                            onClick={() => handleSendRequest(target.username || target.id)}
                          >
                            <UserPlus size={14} />
                            <span>Add Friend</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : searchQuery.length >= 2 ? (
                  <div className="search-empty">
                    <span>No members found matching "{searchQuery}".</span>
                  </div>
                ) : (
                  <div className="search-hint">
                    <span>Type at least 2 characters to search across CoGether players.</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ── VIEW 4: PENDING REQUESTS ── */
            <div className="requests-container">
              <div className="requests-section">
                <h4>Incoming Requests ({pendingRequests.incoming.length})</h4>
                {pendingRequests.incoming.length === 0 ? (
                  <div className="empty-subtext">No incoming friend requests.</div>
                ) : (
                  <div className="requests-list">
                    {pendingRequests.incoming.map((req) => (
                      <div key={req.friendshipId} className="request-card-row">
                        <div className="req-user-meta">
                          <span className="req-name">{req.displayName || req.username}</span>
                          <span className="req-handle">@{req.username}</span>
                        </div>
                        <div className="req-actions">
                          <button
                            type="button"
                            className="btn-req-accept"
                            onClick={() => respondFriendRequest(req.id, 'accept')}
                            title="Accept friend request"
                          >
                            <Check size={14} />
                            <span>Accept</span>
                          </button>
                          <button
                            type="button"
                            className="btn-req-reject"
                            onClick={() => respondFriendRequest(req.id, 'reject')}
                            title="Reject"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="requests-section" style={{ marginTop: '20px' }}>
                <h4>Outgoing Requests ({pendingRequests.outgoing.length})</h4>
                {pendingRequests.outgoing.length === 0 ? (
                  <div className="empty-subtext">No pending outgoing requests.</div>
                ) : (
                  <div className="requests-list">
                    {pendingRequests.outgoing.map((req) => (
                      <div key={req.friendshipId} className="request-card-row">
                        <div className="req-user-meta">
                          <span className="req-name">{req.displayName || req.username}</span>
                          <span className="req-handle">@{req.username}</span>
                        </div>
                        <div className="req-actions">
                          <button
                            type="button"
                            className="btn-req-cancel"
                            onClick={() => cancelFriendRequest(req.id)}
                            title="Cancel request"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
