import React, { useState, useRef, useEffect } from 'react';
import { Send, X, MessageSquare } from 'lucide-react';

export default function ChatPanel({ messages, onSendMessage, onClose, currentUsername }) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  return (
    <div className="chat-panel fade-in">
      <div className="chat-header">
        <div className="chat-title">
          <MessageSquare size={18} />
          <h3>In-Call Chat</h3>
        </div>
        <button className="chat-close-btn" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <div className="chat-messages-container">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <p>No messages yet.</p>
            <span>Say hello to everyone in the room!</span>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderName === currentUsername;
            return (
              <div key={msg.id} className={`chat-message-item ${isMe ? 'message-own' : ''}`}>
                <div className="message-header">
                  <span className="message-sender">{isMe ? 'You' : msg.senderName}</span>
                  <span className="message-time">{msg.timestamp}</span>
                </div>
                <div className="message-bubble">{msg.text}</div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          type="text"
          placeholder="Send a message to room..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="chat-input"
        />
        <button type="submit" className="chat-send-btn" disabled={!inputText.trim()}>
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
