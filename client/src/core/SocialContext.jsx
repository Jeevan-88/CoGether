import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getSignalingUrl } from './signalingConfig';
import { initUserKeyPair, encryptDirectMessage, decryptDirectMessage } from './e2ee';

const SocialContext = createContext(null);

export function SocialProvider({ children }) {
  const { user, accessToken } = useAuth();
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState({ incoming: [], outgoing: [] });
  const [unreadSummary, setUnreadSummary] = useState({ totalUnread: 0, byFriend: {} });
  const [activeFriend, setActiveFriend] = useState(null); // Active DM friend object
  const [activeMessages, setActiveMessages] = useState([]); // Decrypted messages in active DM
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [incomingGameInvite, setIncomingGameInvite] = useState(null);
  const [typingStatus, setTypingStatus] = useState({}); // { [friendUserId]: boolean }
  const [isSocialModalOpen, setIsSocialModalOpen] = useState(false);
  const [socialModalTab, setSocialModalTab] = useState('friends'); // 'friends' | 'search' | 'requests' | 'dm'

  const socketRef = useRef(null);
  const friendKeysCacheRef = useRef(new Map()); // friendUserId -> JWK
  const activeFriendRef = useRef(activeFriend);
  activeFriendRef.current = activeFriend;

  const signalingUrl = getSignalingUrl();

  // Helper for authenticated API calls
  const authFetch = useCallback(async (endpoint, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers || {})
    };
    const res = await fetch(`${signalingUrl}${endpoint}`, {
      ...options,
      headers
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || data.error || 'Request failed');
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }, [accessToken, signalingUrl]);

  // Fetch friend list
  const fetchFriends = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await authFetch('/api/v1/social/friends');
      if (data.success && Array.isArray(data.friends)) {
        setFriends(data.friends);
      }
    } catch (err) {
      console.warn('SocialContext: Failed to fetch friends', err.message);
    }
  }, [accessToken, authFetch]);

  // Fetch pending friend requests
  const fetchPendingRequests = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await authFetch('/api/v1/social/friends/requests');
      if (data.success) {
        setPendingRequests({
          incoming: data.incoming || [],
          outgoing: data.outgoing || []
        });
      }
    } catch (err) {
      console.warn('SocialContext: Failed to fetch friend requests', err.message);
    }
  }, [accessToken, authFetch]);

  // Fetch unread messages summary
  const fetchUnreadSummary = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await authFetch('/api/v1/social/messages/unread/summary');
      if (data.success) {
        setUnreadSummary({
          totalUnread: data.totalUnread || 0,
          byFriend: data.byFriend || {}
        });
      }
    } catch (err) {
      console.warn('SocialContext: Failed to fetch unread summary', err.message);
    }
  }, [accessToken, authFetch]);

  // Get or cache friend public key JWK
  const getFriendPublicKey = useCallback(async (friendUserId) => {
    if (friendKeysCacheRef.current.has(friendUserId)) {
      return friendKeysCacheRef.current.get(friendUserId);
    }
    const data = await authFetch(`/api/v1/social/keys/${friendUserId}`);
    if (data.success && data.publicKey) {
      friendKeysCacheRef.current.set(friendUserId, data.publicKey);
      return data.publicKey;
    }
    throw new Error('Friend public key not found');
  }, [authFetch]);

  // Decrypt an array of direct messages
  const decryptMessageList = useCallback(async (msgs, friendId, friendPublicKey) => {
    if (!user?.id || !friendPublicKey) return msgs;
    const decrypted = await Promise.all(
      msgs.map(async (m) => {
        if (m.plaintext) return m;
        try {
          const text = await decryptDirectMessage(
            user.id,
            friendId,
            friendPublicKey,
            m.ciphertext,
            m.iv
          );
          return { ...m, plaintext: text };
        } catch (e) {
          return { ...m, plaintext: '[Decryption failed]' };
        }
      })
    );
    return decrypted;
  }, [user?.id]);

  // Fetch and decrypt conversation messages
  const fetchMessages = useCallback(async (friendUserId) => {
    if (!accessToken || !user?.id || !friendUserId) return [];
    setIsMessagesLoading(true);
    try {
      const friendKey = await getFriendPublicKey(friendUserId);
      const data = await authFetch(`/api/v1/social/messages/${friendUserId}`);
      if (data.success && Array.isArray(data.messages)) {
        const decrypted = await decryptMessageList(data.messages, friendUserId, friendKey);
        setActiveMessages(decrypted);
        // Mark as read
        await authFetch(`/api/v1/social/messages/${friendUserId}/read`, { method: 'POST' });
        fetchUnreadSummary();
        return decrypted;
      }
      return [];
    } catch (err) {
      console.warn('SocialContext: Failed to fetch messages', err.message);
      return [];
    } finally {
      setIsMessagesLoading(false);
    }
  }, [accessToken, user?.id, getFriendPublicKey, authFetch, decryptMessageList, fetchUnreadSummary]);

  // Send an E2EE encrypted message
  const sendDirectMessage = useCallback(async (friendUserId, plaintext) => {
    if (!accessToken || !user?.id || !plaintext?.trim()) return;
    try {
      const friendKey = await getFriendPublicKey(friendUserId);
      const encrypted = await encryptDirectMessage(user.id, friendUserId, friendKey, plaintext.trim());

      const data = await authFetch('/api/v1/social/messages', {
        method: 'POST',
        body: JSON.stringify({
          recipientId: friendUserId,
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          senderKeyId: encrypted.senderKeyId
        })
      });

      if (data.success && data.message) {
        const fullMsg = { ...data.message, plaintext: plaintext.trim() };
        setActiveMessages(prev => [...prev, fullMsg]);
        return fullMsg;
      }
    } catch (err) {
      console.error('SocialContext: Failed to send direct message', err);
      throw err;
    }
  }, [accessToken, user?.id, getFriendPublicKey, authFetch]);

  // Open Direct Message modal with a specific friend
  const openDirectMessage = useCallback((friend) => {
    setActiveFriend(friend);
    setActiveMessages([]);
    setSocialModalTab('dm');
    setIsSocialModalOpen(true);
    if (friend?.id) {
      fetchMessages(friend.id);
    }
  }, [fetchMessages]);

  const closeDirectMessage = useCallback(() => {
    setActiveFriend(null);
    setActiveMessages([]);
  }, []);

  // Send friend request
  const sendFriendRequest = useCallback(async (target) => {
    const data = await authFetch('/api/v1/social/friends/request', {
      method: 'POST',
      body: JSON.stringify({ target })
    });
    fetchPendingRequests();
    return data;
  }, [authFetch, fetchPendingRequests]);

  // Respond to friend request (accept / reject)
  const respondFriendRequest = useCallback(async (requesterId, action) => {
    const data = await authFetch('/api/v1/social/friends/respond', {
      method: 'POST',
      body: JSON.stringify({ requesterId, action })
    });
    fetchPendingRequests();
    fetchFriends();
    return data;
  }, [authFetch, fetchPendingRequests, fetchFriends]);

  // Cancel outgoing request
  const cancelFriendRequest = useCallback(async (recipientId) => {
    const data = await authFetch('/api/v1/social/friends/cancel', {
      method: 'POST',
      body: JSON.stringify({ recipientId })
    });
    fetchPendingRequests();
    return data;
  }, [authFetch, fetchPendingRequests]);

  // Remove friend
  const removeFriend = useCallback(async (friendUserId) => {
    const data = await authFetch(`/api/v1/social/friends/${friendUserId}`, {
      method: 'DELETE'
    });
    fetchFriends();
    if (activeFriend?.id === friendUserId) {
      closeDirectMessage();
    }
    return data;
  }, [authFetch, fetchFriends, activeFriend?.id, closeDirectMessage]);

  // Block user
  const blockUser = useCallback(async (targetUserId) => {
    const data = await authFetch('/api/v1/social/users/block', {
      method: 'POST',
      body: JSON.stringify({ targetUserId })
    });
    fetchFriends();
    fetchPendingRequests();
    return data;
  }, [authFetch, fetchFriends, fetchPendingRequests]);

  // Unblock user
  const unblockUser = useCallback(async (targetUserId) => {
    const data = await authFetch('/api/v1/social/users/unblock', {
      method: 'POST',
      body: JSON.stringify({ targetUserId })
    });
    return data;
  }, [authFetch]);

  // Search users
  const searchUsers = useCallback(async (query) => {
    if (!query || query.trim().length < 2) return [];
    const data = await authFetch(`/api/v1/social/users/search?q=${encodeURIComponent(query.trim())}`);
    return data.users || [];
  }, [authFetch]);

  // Create private room
  const createPrivateRoom = useCallback(async (gameId, options = {}) => {
    const data = await authFetch('/api/v1/coplay/rooms/private', {
      method: 'POST',
      body: JSON.stringify({ gameId, options })
    });
    return data.room;
  }, [authFetch]);

  // Send game invitation
  const inviteFriendToRoom = useCallback(async (inviteeId, roomId, gameId) => {
    const data = await authFetch('/api/v1/coplay/rooms/invite', {
      method: 'POST',
      body: JSON.stringify({ inviteeId, roomId, gameId })
    });
    return data;
  }, [authFetch]);

  // Accept game invitation
  const acceptGameInvite = useCallback(async (token) => {
    const data = await authFetch(`/api/v1/coplay/invitations/${token}/accept`, {
      method: 'POST'
    });
    setIncomingGameInvite(null);
    return data;
  }, [authFetch]);

  // Reject game invitation
  const rejectGameInvite = useCallback(async (token) => {
    const data = await authFetch(`/api/v1/coplay/invitations/${token}/reject`, {
      method: 'POST'
    });
    setIncomingGameInvite(null);
    return data;
  }, [authFetch]);

  const dismissIncomingGameInvite = useCallback(() => {
    setIncomingGameInvite(null);
  }, []);

  // Send typing indicator
  const sendTypingIndicator = useCallback((recipientId, isTyping) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('dm:typing', { recipientId, isTyping });
    }
  }, []);

  // Socket Connection & Realtime Event Dispatcher
  useEffect(() => {
    if (!accessToken || !user?.id) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Initialize E2EE keypair once user is authenticated
    initUserKeyPair(user.id, accessToken, signalingUrl).catch((err) => {
      console.warn('SocialContext: E2EE key initialization error', err);
    });

    // Initial data fetch
    fetchFriends();
    fetchPendingRequests();
    fetchUnreadSummary();

    // Create persistent authenticated socket
    const socket = io(signalingUrl, {
      auth: { token: accessToken },
      reconnectionAttempts: 5,
      timeout: 10000
    });
    socketRef.current = socket;

    // Presence update
    socket.on('social:user_presence', ({ userId, online }) => {
      setFriends(prev => prev.map(f => f.id === userId ? { ...f, online } : f));
      if (activeFriendRef.current?.id === userId) {
        setActiveFriend(prev => prev ? { ...prev, online } : prev);
      }
    });

    // Incoming friend request
    socket.on('social:friend_request_received', () => {
      fetchPendingRequests();
    });

    // Friend request accepted
    socket.on('social:friend_request_accepted', () => {
      fetchFriends();
      fetchPendingRequests();
    });

    socket.on('social:friend_request_cancelled', () => {
      fetchPendingRequests();
    });

    socket.on('social:friend_removed', ({ userId }) => {
      setFriends(prev => prev.filter(f => f.id !== userId));
      if (activeFriendRef.current?.id === userId) {
        closeDirectMessage();
      }
    });

    // CoPlay Game Invitation
    socket.on('coplay:invite_received', (payload) => {
      setIncomingGameInvite(payload);
    });

    // Realtime Direct Message Received
    socket.on('social:dm_received', async ({ message }) => {
      const currentActive = activeFriendRef.current;
      if (currentActive && (currentActive.id === message.sender_id || currentActive.id === message.recipient_id)) {
        try {
          const friendKey = await getFriendPublicKey(message.sender_id);
          const plaintext = await decryptDirectMessage(
            user.id,
            message.sender_id,
            friendKey,
            message.ciphertext,
            message.iv
          );
          setActiveMessages(prev => [...prev, { ...message, plaintext }]);
          // Mark as read immediately since user is actively viewing this DM
          authFetch(`/api/v1/social/messages/${message.sender_id}/read`, { method: 'POST' }).catch(() => {});
        } catch (e) {
          setActiveMessages(prev => [...prev, { ...message, plaintext: '[Decryption failed]' }]);
        }
      } else {
        fetchUnreadSummary();
      }
    });

    // Typing indicator received
    socket.on('social:dm_typing', ({ senderId, isTyping }) => {
      setTypingStatus(prev => ({ ...prev, [senderId]: isTyping }));
    });

    // Read receipt received
    socket.on('social:dm_read', ({ readerId }) => {
      setActiveMessages(prev =>
        prev.map(m => m.recipient_id === readerId ? { ...m, status: 'read', read_at: new Date().toISOString() } : m)
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken, user?.id, signalingUrl, fetchFriends, fetchPendingRequests, fetchUnreadSummary, getFriendPublicKey, authFetch, closeDirectMessage]);

  const value = {
    friends,
    pendingRequests,
    unreadSummary,
    activeFriend,
    activeMessages,
    isMessagesLoading,
    incomingGameInvite,
    typingStatus,
    isSocialModalOpen,
    socialModalTab,
    setIsSocialModalOpen,
    setSocialModalTab,
    fetchFriends,
    fetchPendingRequests,
    fetchUnreadSummary,
    sendFriendRequest,
    respondFriendRequest,
    cancelFriendRequest,
    removeFriend,
    blockUser,
    unblockUser,
    searchUsers,
    openDirectMessage,
    closeDirectMessage,
    sendDirectMessage,
    fetchMessages,
    sendTypingIndicator,
    createPrivateRoom,
    inviteFriendToRoom,
    acceptGameInvite,
    rejectGameInvite,
    dismissIncomingGameInvite,
    socket: socketRef.current
  };

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
}

export function useSocial() {
  const context = useContext(SocialContext);
  if (!context) {
    throw new Error('useSocial must be used within a SocialProvider');
  }
  return context;
}
