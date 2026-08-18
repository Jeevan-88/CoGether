import React, { useState } from 'react';
import { X, ShieldCheck, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import './PricingModal.css';

export default function PricingModal({ onClose, onSuccess }) {
  const [step, setStep] = useState('summary'); // summary | checkout | success
  const [upiId, setUpiId] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePay = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep('success');
      if (onSuccess) onSuccess();
    }, 1200);
  };

  return (
    <div className="modal-overlay fade-in">
      <div className="pricing-modal-card">
        <button className="modal-close" onClick={onClose} aria-label="Close modal">
          <X size={18} />
        </button>

        {step === 'summary' && (
          <div className="pricing-summary-view">
            <div className="badge-glow">[ ALL-ACCESS KEYPASS ]</div>
            <h2>CoGether Master Keypass</h2>
            <p className="modal-sub">Unlock unlimited 4K synced cinema, 100+ arcade multiplayer games, and private split-screen study desks.</p>

            <div className="price-box">
              <span className="price-currency">₹</span>
              <span className="price-number">49</span>
              <span className="price-unit">/ month</span>
            </div>

            <ul className="modal-feature-list">
              <li><CheckCircle2 size={16} /> Unlimited 4K Synced Watch Parties (Cinema & Series)</li>
              <li><CheckCircle2 size={16} /> 100+ Multiplayer & Solo Arcade Games Hub</li>
              <li><CheckCircle2 size={16} /> Private 2-Way Live Study Desks with Lo-Fi Audio</li>
              <li><CheckCircle2 size={16} /> Zero Ads, Low-Latency WebRTC & Squad Room Sync</li>
            </ul>

            <button className="btn-pay-now" onClick={() => setStep('checkout')}>
              Acquire Master Keypass (₹49) <ArrowRight size={16} />
            </button>
          </div>
        )}

        {step === 'checkout' && (
          <div className="pricing-checkout-view">
            <div className="razorpay-header">
              <ShieldCheck size={20} className="shield-icon" />
              <span>Secure Instant Payment</span>
            </div>

            <div className="order-summary-row">
              <span>Plan: CoGether Master Keypass</span>
              <strong>₹49.00</strong>
            </div>

            <form onSubmit={handlePay} className="checkout-form">
              <label>Payment Method</label>
              <div className="payment-options">
                <label className="payment-radio active">
                  <input type="radio" name="pay" defaultChecked />
                  <span>UPI (Google Pay / PhonePe / Paytm / BHIM)</span>
                </label>
              </div>

              <input
                type="text"
                placeholder="Enter UPI ID (e.g. username@upi)"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                required
                className="upi-input"
              />

              <button type="submit" className="btn-confirm-pay" disabled={loading}>
                {loading ? 'Activating Keypass...' : 'Pay ₹49 & Unlock Access'}
              </button>
            </form>
          </div>
        )}

        {step === 'success' && (
          <div className="pricing-success-view">
            <div className="success-icon-circle">
              <CheckCircle2 size={40} />
            </div>
            <h2>Keypass Activated!</h2>
            <p>Your CoGether Master Keypass is now live. Enjoy unlimited 4K synced cinema, 100+ arcade games, and private desks.</p>

            <button className="btn-continue" onClick={onClose}>
              Enter CoGether Hub <Sparkles size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
