import React, { useState } from 'react';
import { X, ShieldCheck, CheckCircle2, CreditCard, Sparkles, Lock, ArrowRight } from 'lucide-react';
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
    }, 1500);
  };

  return (
    <div className="modal-overlay fade-in">
      <div className="pricing-modal-card">
        <button className="modal-close" onClick={onClose}>
          <X size={18} />
        </button>

        {step === 'summary' && (
          <div className="pricing-summary-view">
            <div className="badge-glow">LIMITED OFFER</div>
            <h2>Teleparty Telepathy Premium</h2>
            <p className="modal-sub">Unlock unlimited Watch Together parties, Poki multiplayer games, and merged telepresence camera mode.</p>

            <div className="price-box">
              <span className="price-currency">₹</span>
              <span className="price-number">49</span>
              <span className="price-unit">/ month</span>
            </div>

            <ul className="modal-feature-list">
              <li><CheckCircle2 size={16} /> Unlimited Sync Watch Parties (YouTube, Movies)</li>
              <li><CheckCircle2 size={16} /> Poki Multiplayer Arcade Games Hub</li>
              <li><CheckCircle2 size={16} /> Seamless Merged Camera Telepresence (No Seams)</li>
              <li><CheckCircle2 size={16} /> Telegram-Grade E2EE Encryption</li>
            </ul>

            <button className="btn-pay-now" onClick={() => setStep('checkout')}>
              Proceed to Checkout (₹49) <ArrowRight size={16} />
            </button>
          </div>
        )}

        {step === 'checkout' && (
          <div className="pricing-checkout-view">
            <div className="razorpay-header">
              <ShieldCheck size={20} className="shield-icon" />
              <span>Razorpay Secure Checkout</span>
            </div>

            <div className="order-summary-row">
              <span>Plan: Telepathy Monthly</span>
              <strong>₹49.00</strong>
            </div>

            <form onSubmit={handlePay} className="checkout-form">
              <label>Select Payment Method</label>
              <div className="payment-options">
                <label className="payment-radio active">
                  <input type="radio" name="pay" defaultChecked />
                  <span>UPI (Google Pay / PhonePe / Paytm)</span>
                </label>
              </div>

              <input
                type="text"
                placeholder="Enter UPI ID (e.g. user@upi)"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                required
                className="upi-input"
              />

              <button type="submit" className="btn-confirm-pay" disabled={loading}>
                {loading ? 'Processing Encrypted Payment...' : 'Pay ₹49 Now'}
              </button>
            </form>
          </div>
        )}

        {step === 'success' && (
          <div className="pricing-success-view">
            <div className="success-icon-circle">
              <CheckCircle2 size={40} />
            </div>
            <h2>Payment Successful!</h2>
            <p>Your Telepathy Premium Plan is now active. Enjoy unlimited HD rooms and merged camera parties!</p>

            <button className="btn-continue" onClick={onClose}>
              Start Premium Call Room <Sparkles size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
