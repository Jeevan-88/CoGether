import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Bot, User, ArrowRight, Star } from 'lucide-react';
import { API_URL } from '../../../config/api.js';
import './AIShoppingAssistantModal.css';

export default function AIShoppingAssistantModal({
  isOpen,
  onClose,
  onSelectProduct
}) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'ai',
      text: "👋 Hi! I'm your CoGether AI Shopping Assistant. Ask me anything like 'black running shoes under ₹3000' or 'coding laptop under ₹80k', and I will find verified deals across Amazon, Myntra, Flipkart, and AJIO!",
      products: []
    }
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  if (!isOpen) return null;

  const quickPrompts = [
    'Find running shoes under ₹3000',
    'Coding laptop under ₹80k',
    'Over-ear headphones under ₹3000',
    'Black casual shirt under ₹1500'
  ];

  const handleSendPrompt = async (promptText) => {
    const textToSend = promptText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg = {
      id: Math.random().toString(36).substr(2, 9),
      sender: 'user',
      text: textToSend.trim(),
      products: []
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/coshop/ai-assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: textToSend })
      });

      if (res.ok) {
        const data = await res.json();
        const aiMsg = {
          id: Math.random().toString(36).substr(2, 9),
          sender: 'ai',
          text: data.reply || 'Here are the best matches I found:',
          products: data.recommendedProducts || [],
          bestValuePick: data.bestValuePick
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substr(2, 9),
            sender: 'ai',
            text: 'I ran into an issue querying the catalog. Please try again shortly.',
            products: []
          }
        ]);
      }
    } catch (err) {
      console.error('AI assistant error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substr(2, 9),
          sender: 'ai',
          text: 'Unable to reach the AI assistant. Please check your network connection.',
          products: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-assistant-modal-backdrop" onClick={onClose}>
      <div className="ai-assistant-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ai-modal-header">
          <div className="ai-title-block">
            <div className="ai-icon-badge">
              <Sparkles size={16} />
            </div>
            <div>
              <h3>COGETHER AI SHOPPING ASSISTANT</h3>
              <span className="ai-subtitle">Factual product intelligence across Indian retailers</span>
            </div>
          </div>
          <button type="button" className="btn-close-ai" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Suggestion Chips */}
        <div className="ai-suggestions-strip">
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              type="button"
              className="ai-suggestion-chip"
              onClick={() => handleSendPrompt(p)}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Conversation Stream */}
        <div className="ai-conversation-scroll" ref={scrollRef}>
          {messages.map((msg) => (
            <div key={msg.id} className={`ai-message-row ${msg.sender}`}>
              <div className="message-avatar">
                {msg.sender === 'ai' ? <Bot size={14} /> : <User size={14} />}
              </div>
              <div className="message-bubble-content">
                <div className="message-text">{msg.text}</div>

                {/* Embedded Recommended Products */}
                {msg.products && msg.products.length > 0 && (
                  <div className="ai-embedded-products-grid">
                    {msg.products.map((p) => (
                      <div
                        key={p.id}
                        className="ai-mini-product-card"
                        onClick={() => {
                          onSelectProduct?.(p);
                          onClose();
                        }}
                      >
                        <img src={p.thumbnail} alt={p.title} className="mini-card-img" />
                        <div className="mini-card-info">
                          <span className="mini-brand">{p.brand}</span>
                          <h5 className="mini-title">{p.title}</h5>
                          <div className="mini-price-row">
                            <span className="mini-price">₹{p.price.toLocaleString('en-IN')}</span>
                            <span className="mini-retailer">{p.retailerName}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="ai-message-row ai">
              <div className="message-avatar">
                <Bot size={14} />
              </div>
              <div className="ai-thinking-bubble">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
                <span className="thinking-text">Searching indexed catalog across Amazon, Myntra, Flipkart, AJIO...</span>
              </div>
            </div>
          )}
        </div>

        {/* Prompt Input Form */}
        <form
          className="ai-input-form-row"
          onSubmit={(e) => {
            e.preventDefault();
            handleSendPrompt();
          }}
        >
          <input
            type="text"
            className="ai-chat-input"
            placeholder="E.g. Find gaming mouse under ₹2000 with high ratings..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="btn-send-ai-prompt" disabled={loading || !input.trim()}>
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
