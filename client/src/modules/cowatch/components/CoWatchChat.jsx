import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile, MessageSquare, X } from 'lucide-react';
import './CoWatchChat.css';

const QUICK_REACTIONS = ['❤️', '😂', '😮', '🔥', '👏'];
const POPULAR_EMOJIS = ['😀', '😂', '😍', '🔥', '👏', '🎉', '🍿', '😮', '💀', '👀', '💯', '🚀', '❤️', '🙌', '😎', '🥳'];

export default function CoWatchChat({
  messages = [],
  onSendMessage,
  onSendReaction,
  currentUsername,
  onClose
}) {
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const pickerRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Click outside to close emoji picker
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showEmojiPicker]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
    setShowEmojiPicker(false);
  };

  const handleSelectEmoji = (emoji) => {
    setInputText((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  return (
    <div className="cowatch-chat-container">
      {/* Header */}
      <div className="cowatch-chat-header">
        <div className="chat-title-group">
          <MessageSquare size={14} className="chat-icon" />
          <span className="chat-title">LIVE CHAT</span>
          <span className="chat-count">({messages.length})</span>
        </div>

        {onClose && (
          <button type="button" className="btn-chat-close" onClick={onClose} title="Close Chat">
            <X size={15} />
          </button>
        )}
      </div>

      {/* Quick Reactions Bar */}
      <div className="cowatch-quick-reactions-strip">
        <span className="reactions-label">REACT:</span>
        <div className="reactions-buttons">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="btn-quick-reaction"
              onClick={() => onSendReaction?.(emoji)}
              title={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Message List (Scrollable Area) */}
      <div className="cowatch-chat-messages-area">
        {messages.length === 0 ? (
          <div className="chat-empty-hint">
            <span className="empty-title">Watching Together</span>
            <p className="empty-subtext">Chat with your friends and send live reactions as you watch!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.senderName === currentUsername;
            return (
              <div
                key={msg.id || Math.random()}
                className={`cowatch-chat-bubble-row ${isOwn ? 'is-own' : ''}`}
              >
                <div className="chat-bubble-card">
                  <div className="bubble-meta">
                    <span className="bubble-sender">{isOwn ? 'You' : msg.senderName}</span>
                    <span className="bubble-time">{msg.timestamp || 'Now'}</span>
                  </div>
                  <p className="bubble-text">{msg.text}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <div ref={pickerRef} className="cowatch-emoji-picker-popover fade-in">
          <div className="emoji-grid">
            {POPULAR_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="btn-emoji-item"
                onClick={() => handleSelectEmoji(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Bar */}
      <form onSubmit={handleSubmit} className="cowatch-chat-input-row">
        <button
          type="button"
          className={`btn-toggle-emoji ${showEmojiPicker ? 'active' : ''}`}
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          title="Add Emoji"
        >
          <Smile size={16} />
        </button>

        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Comment or react..."
          className="chat-text-input"
          maxLength={400}
        />

        <button
          type="submit"
          className="btn-send-message"
          disabled={!inputText.trim()}
          title="Send message"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
