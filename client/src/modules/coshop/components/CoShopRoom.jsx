import React, { useState, useEffect } from 'react';
import { useWebRTC } from '../../../core/useWebRTC.js';
import { 
  Users, MessageSquare, Mic, MicOff, Video, VideoOff, 
  Share2, Heart, ExternalLink, X, Copy, Check, Sparkles,
  ShoppingBag, Star, Flame, ThumbsUp, ThumbsDown
} from 'lucide-react';
import CoWatchCameraTile from '../../cowatch/components/CoWatchCameraTile.jsx';
import ProductCard from './ProductCard.jsx';
import ProductDetailModal from './ProductDetailModal.jsx';
import SharedCartDrawer from './SharedCartDrawer.jsx';
import { API_URL } from '../../../config/api.js';
import './CoShopRoom.css';

const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL || 'http://localhost:3001';

export default function CoShopRoom({
  roomId,
  username,
  onLeave
}) {
  // 1. Live WebRTC Connection
  const {
    localStream,
    remoteStreams,
    micEnabled,
    cameraEnabled,
    connected,
    socketRef,
    chatMessages,
    toggleMic,
    toggleCamera,
    sendChatMessage
  } = useWebRTC(roomId, username, SIGNALING_URL);

  // 2. Catalog & Discovery State
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(null);

  // 3. Shared Social Shopping State
  const [sharedProductCard, setSharedProductCard] = useState(null);
  const [roomReactions, setRoomReactions] = useState({ '❤️': 0, '🔥': 0, '👍': 0, '👎': 0 });
  const [sharedWishlist, setSharedWishlist] = useState([]);
  const [sharedCart, setSharedCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);

  // 4. UI Layout & Modals
  const [copiedCode, setCopiedCode] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [chatInput, setChatInput] = useState('');

  // Fetch initial catalog
  useEffect(() => {
    fetch(`${API_URL}/api/coshop/products?limit=24`)
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []))
      .catch((e) => console.error('CoShop Room product fetch failed:', e));
  }, []);

  // Socket event listeners for real-time room synchronization
  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket) return;

    const onProductShared = ({ product, senderName }) => {
      setSharedProductCard({ ...product, sharedBy: senderName });
      setRoomReactions({ '❤️': 0, '🔥': 0, '👍': 0, '👎': 0 });
    };

    const onReactionReceived = ({ emoji }) => {
      setRoomReactions((prev) => ({
        ...prev,
        [emoji]: (prev[emoji] || 0) + 1
      }));
    };

    const onWishlistUpdated = ({ wishlist }) => {
      setSharedWishlist(wishlist);
    };

    const onCartUpdated = ({ cart }) => {
      setSharedCart(cart);
    };

    socket.on('coshop-product-shared', onProductShared);
    socket.on('coshop-reaction-received', onReactionReceived);
    socket.on('coshop-wishlist-updated', onWishlistUpdated);
    socket.on('coshop-cart-updated', onCartUpdated);

    return () => {
      socket.off('coshop-product-shared', onProductShared);
      socket.off('coshop-reaction-received', onReactionReceived);
      socket.off('coshop-wishlist-updated', onWishlistUpdated);
      socket.off('coshop-cart-updated', onCartUpdated);
    };
  }, [socketRef, connected]);

  // Handle sharing product to friend
  const handleShareProductToRoom = (product) => {
    setSharedProductCard({ ...product, sharedBy: 'You' });
    setRoomReactions({ '❤️': 0, '🔥': 0, '👍': 0, '👎': 0 });

    if (socketRef.current) {
      socketRef.current.emit('coshop-share-product', { product });
    }
  };

  // Handle reaction on shared product
  const handleSendReaction = (emoji) => {
    if (!sharedProductCard) return;
    setRoomReactions((prev) => ({ ...prev, [emoji]: (prev[emoji] || 0) + 1 }));

    if (socketRef.current) {
      socketRef.current.emit('coshop-reaction', {
        productId: sharedProductCard.id,
        emoji
      });
    }
  };

  // Toggle wishlist
  const handleToggleWishlist = (product) => {
    const isExistent = sharedWishlist.some((p) => p.id === product.id);
    const updated = isExistent 
      ? sharedWishlist.filter((p) => p.id !== product.id)
      : [...sharedWishlist, product];

    setSharedWishlist(updated);
    if (socketRef.current) {
      socketRef.current.emit('coshop-wishlist-sync', { wishlist: updated });
    }
  };

  // Add to shared cart
  const handleAddToCart = (product) => {
    const updated = [...sharedCart, product];
    setSharedCart(updated);
    if (socketRef.current) {
      socketRef.current.emit('coshop-cart-sync', { cart: updated });
    }
  };

  // Copy Room Link
  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${roomId}&mode=shop`;
    navigator.clipboard.writeText(url);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Send room chat
  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput.trim());
    setChatInput('');
  };

  const remoteEntries = Object.entries(remoteStreams);
  const totalInRoom = remoteEntries.length + 1;

  // Filter products locally for instant response
  const filteredProducts = products.filter((p) => {
    if (selectedCategory !== 'all' && p.category.toLowerCase() !== selectedCategory.toLowerCase()) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.title.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="coshop-room-viewport-root">
      {/* ── TOP ROOM NAVIGATION BAR ── */}
      <header className="coshop-room-top-header">
        <div className="room-header-left">
          <button type="button" className="btn-room-brand" onClick={onLeave}>
            <span>← COSHOP</span>
          </button>
          <div className="room-title-block">
            <span className="live-pulse" />
            <h2>SHARED SHOPPING ROOM</h2>
          </div>
        </div>

        <div className="room-header-center">
          <button type="button" className="btn-copy-room-code" onClick={handleCopyLink}>
            <span className="code-lbl">ROOM:</span>
            <span className="code-text">{roomId}</span>
            {copiedCode ? <Check size={12} className="green" /> : <Copy size={12} />}
          </button>
        </div>

        <div className="room-header-right">
          <div className="watching-badge">
            <Users size={13} />
            <span>{totalInRoom} SHOPPING TOGETHER</span>
          </div>

          <button
            type="button"
            className="btn-open-cart-deck"
            onClick={() => setIsCartOpen(true)}
            title="Open Shared Cart"
          >
            <ShoppingBag size={14} />
            <span>CART ({sharedCart.length})</span>
          </button>

          <button
            type="button"
            className="btn-room-leave"
            onClick={onLeave}
            title="Leave room"
          >
            LEAVE
          </button>
        </div>
      </header>

      {/* ── MAIN DUAL-PANE VIEWPORT ── */}
      <main className="coshop-room-main-layout">
        {/* LEFT: PRODUCT DISCOVERY & CATALOG */}
        <section className="coshop-room-catalog-pane">
          {/* Active Live Shared Product Banner (When a friend shares an item) */}
          {sharedProductCard && (
            <div className="live-shared-product-card-banner">
              <div className="shared-card-header">
                <div className="shared-by-tag">
                  <Share2 size={12} />
                  <span>{sharedProductCard.sharedBy} SHARED A PRODUCT FOR DISCUSSION:</span>
                </div>
                <button
                  type="button"
                  className="btn-dismiss-shared-banner"
                  onClick={() => setSharedProductCard(null)}
                >
                  <X size={13} />
                </button>
              </div>

              <div className="shared-card-content-row">
                <img src={sharedProductCard.thumbnail} alt={sharedProductCard.title} className="shared-card-thumb" />
                <div className="shared-card-info">
                  <span className="shared-brand">{sharedProductCard.brand}</span>
                  <h4 className="shared-title">{sharedProductCard.title}</h4>
                  <div className="shared-price-line">
                    <span className="shared-price">₹{sharedProductCard.price.toLocaleString('en-IN')}</span>
                    <span className="shared-retailer">Sold on {sharedProductCard.retailerName}</span>
                  </div>
                </div>

                {/* Social Reactions Cluster */}
                <div className="shared-card-reactions-cluster">
                  <button
                    type="button"
                    className="reaction-btn"
                    onClick={() => handleSendReaction('❤️')}
                  >
                    <span>❤️</span>
                    <span className="reaction-count">{roomReactions['❤️'] || ''}</span>
                  </button>
                  <button
                    type="button"
                    className="reaction-btn"
                    onClick={() => handleSendReaction('🔥')}
                  >
                    <span>🔥</span>
                    <span className="reaction-count">{roomReactions['🔥'] || ''}</span>
                  </button>
                  <button
                    type="button"
                    className="reaction-btn"
                    onClick={() => handleSendReaction('👍')}
                  >
                    <span>👍</span>
                    <span className="reaction-count">{roomReactions['👍'] || ''}</span>
                  </button>
                  <button
                    type="button"
                    className="reaction-btn"
                    onClick={() => handleSendReaction('👎')}
                  >
                    <span>👎</span>
                    <span className="reaction-count">{roomReactions['👎'] || ''}</span>
                  </button>
                </div>

                <div className="shared-card-actions">
                  <button
                    type="button"
                    className="btn-view-shared-details"
                    onClick={() => setSelectedProduct(sharedProductCard)}
                  >
                    COMPARE STORES
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Search & Category Filter Bar */}
          <div className="room-catalog-search-bar">
            <input
              type="text"
              placeholder="Search products together across stores..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="room-search-input"
            />
            <div className="room-category-chips">
              {['all', 'Footwear', 'Laptops', 'Audio', 'Gaming', 'Fashion'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`room-cat-btn ${selectedCategory.toLowerCase() === cat.toLowerCase() ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat === 'all' ? 'All Products' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="room-products-grid">
            {filteredProducts.map((prod) => (
              <ProductCard
                key={prod.id}
                product={prod}
                onSelect={(p) => setSelectedProduct(p)}
                isWishlisted={sharedWishlist.some((w) => w.id === prod.id)}
                onToggleWishlist={handleToggleWishlist}
                inRoomMode={true}
                onSendToFriend={handleShareProductToRoom}
              />
            ))}
          </div>
        </section>

        {/* RIGHT: WEBRTC CAMERAS & LIVE DISCUSSION RAIL */}
        <aside className="coshop-room-social-rail">
          {/* Zoom-Style Rectangular Camera Feeds */}
          <div className="room-cameras-strip">
            <div className="camera-tile-wrapper">
              <CoWatchCameraTile
                stream={localStream}
                label={`${username} (You)`}
                isLocal={true}
                micEnabled={micEnabled}
                cameraEnabled={cameraEnabled}
              />
            </div>

            {remoteEntries.map(([peerId, peer]) => (
              <div key={peerId} className="camera-tile-wrapper">
                <CoWatchCameraTile
                  stream={peer.stream}
                  label={peer.username || 'Friend'}
                  isLocal={false}
                  micEnabled={peer.micEnabled}
                  cameraEnabled={peer.cameraEnabled}
                />
              </div>
            ))}
          </div>

          {/* Audio / Video Controls Deck */}
          <div className="room-media-controls-deck">
            <button
              type="button"
              className={`media-ctrl-btn ${micEnabled ? 'mic-active' : 'mic-muted'}`}
              onClick={toggleMic}
              title={micEnabled ? 'Mute Mic' : 'Unmute Mic'}
            >
              {micEnabled ? <Mic size={14} /> : <MicOff size={14} />}
              <span>{micEnabled ? 'MIC ON' : 'MUTED'}</span>
            </button>

            <button
              type="button"
              className={`media-ctrl-btn ${cameraEnabled ? 'cam-active' : 'cam-off'}`}
              onClick={toggleCamera}
              title={cameraEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
            >
              {cameraEnabled ? <Video size={14} /> : <VideoOff size={14} />}
              <span>{cameraEnabled ? 'CAM ON' : 'CAM OFF'}</span>
            </button>
          </div>

          {/* Live Chat Discussion */}
          <div className="room-chat-box">
            <div className="room-chat-header">
              <MessageSquare size={13} />
              <span>SHOPPING CHAT</span>
            </div>

            <div className="room-chat-messages-scroll">
              {chatMessages.length === 0 ? (
                <div className="chat-empty-hint">
                  <span>Chat with friends, discuss prices, and vote on deals!</span>
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div key={msg.id} className="room-chat-msg-row">
                    <span className="msg-sender">{msg.senderName}:</span>
                    <span className="msg-text">{msg.text}</span>
                  </div>
                ))
              )}
            </div>

            <form className="room-chat-input-row" onSubmit={handleSendChat}>
              <input
                type="text"
                placeholder="Ask friend: Which one should I buy?..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="room-chat-input"
              />
              <button type="submit" className="btn-send-chat" disabled={!chatInput.trim()}>
                Send
              </button>
            </form>
          </div>
        </aside>
      </main>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          isWishlisted={sharedWishlist.some((w) => w.id === selectedProduct.id)}
          onToggleWishlist={handleToggleWishlist}
          onAddToCart={handleAddToCart}
          inRoomMode={true}
          onSendToFriend={handleShareProductToRoom}
        />
      )}

      {/* Shared Cart Drawer */}
      <SharedCartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={sharedCart}
        onRemoveItem={(item) => {
          const updated = sharedCart.filter((p) => p !== item);
          setSharedCart(updated);
          if (socketRef.current) socketRef.current.emit('coshop-cart-sync', { cart: updated });
        }}
        onClearCart={() => {
          setSharedCart([]);
          if (socketRef.current) socketRef.current.emit('coshop-cart-sync', { cart: [] });
        }}
      />
    </div>
  );
}
