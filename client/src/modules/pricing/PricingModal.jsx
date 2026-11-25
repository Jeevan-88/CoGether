import React, { useState } from 'react';
import { X, ShieldCheck, CheckCircle2, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../../core/AuthContext.jsx';
import { API_URL, parseApiResponse, formatNetworkError } from '../../config/api.js';
import { analytics } from '../../core/analytics.js';
import './PricingModal.css';

export default function PricingModal({ onClose, onSuccess }) {
  const { isAuthenticated, user, accessToken, restoreSession } = useAuth();
  const [step, setStep] = useState('summary'); // summary | checkout | success
  const [upiId, setUpiId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handlePay = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!isAuthenticated || user?.isGuest) {
      setErrorMessage('Please sign in with your CoGether account before unlocking Keypass.');
      return;
    }

    setLoading(true);
    try {
      analytics.trackEvent('keypass_checkout_started');
      const headers = { 'Content-Type': 'application/json' };
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

      const orderRes = await fetch(`${API_URL}/api/v1/billing/keypass/create-order`, {
        method: 'POST',
        headers,
        credentials: 'include'
      });
      const orderData = await parseApiResponse(orderRes);

      if (!orderRes.ok || !orderData.success) {
        setErrorMessage(
          orderData.message || 'Live payment gateway is not configured on this server yet.'
        );
        return;
      }

      if (orderData.provider === 'razorpay' && window.Razorpay) {
        await new Promise((resolve, reject) => {
          const rzp = new window.Razorpay({
            key: orderData.keyId,
            amount: orderData.amountPaise,
            currency: orderData.currency || 'INR',
            name: 'CoGether',
            description: 'Master Keypass Monthly Membership',
            order_id: orderData.orderId,
            prefill: { email: user?.email || '', name: user?.displayName || '' },
            handler: async (paymentResp) => {
              try {
                const verifyRes = await fetch(`${API_URL}/api/v1/billing/keypass/activate`, {
                  method: 'POST',
                  headers,
                  credentials: 'include',
                  body: JSON.stringify({
                    provider: 'razorpay',
                    orderId: paymentResp.razorpay_order_id,
                    paymentId: paymentResp.razorpay_payment_id,
                    signature: paymentResp.razorpay_signature
                  })
                });
                const verifyData = await parseApiResponse(verifyRes);
                if (!verifyRes.ok || !verifyData.success) {
                  reject(new Error(verifyData.message || 'Payment verification failed.'));
                  return;
                }
                resolve(verifyData);
              } catch (err) {
                reject(err);
              }
            },
            modal: {
              ondismiss: () => reject(new Error('Checkout cancelled before completion.'))
            }
          });
          rzp.open();
        });
      } else if (orderData.provider === 'sandbox_preview') {
        const activateRes = await fetch(`${API_URL}/api/v1/billing/keypass/activate`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            provider: 'sandbox_preview',
            orderId: orderData.orderId,
            upiId: upiId.trim()
          })
        });
        const activateData = await parseApiResponse(activateRes);
        if (!activateRes.ok || !activateData.success) {
          setErrorMessage(activateData.message || 'Activation failed.');
          return;
        }
      } else {
        setErrorMessage('Razorpay checkout script is unavailable right now. Please try again later.');
        return;
      }

      analytics.trackEvent('keypass_activated');
      await restoreSession?.().catch(() => {});
      setStep('success');
      if (onSuccess) onSuccess();
    } catch (err) {
      setErrorMessage(formatNetworkError(err, 'Checkout failed. Please try again.'));
    } finally {
      setLoading(false);
    }
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
            <p className="modal-sub">Unlock unlimited 4K synced cinema, verified arcade multiplayer games, and private split-screen study desks.</p>

            <div className="price-box">
              <span className="price-currency">₹</span>
              <span className="price-number">49</span>
              <span className="price-unit">/ month</span>
            </div>

            <ul className="modal-feature-list">
              <li><CheckCircle2 size={16} /> Unlimited 4K Synced Watch Parties (Cinema & Series)</li>
              <li><CheckCircle2 size={16} /> Verified Open-Source & Solo Arcade Games Hub</li>
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

              {errorMessage && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: 'rgba(239, 68, 68, 0.14)', border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#fca5a5', padding: '10px 12px', borderRadius: '10px', fontSize: '12px', marginBottom: '10px'
                }}>
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  <span>{errorMessage}</span>
                </div>
              )}

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
            <p>Your CoGether Master Keypass is now live. Enjoy unlimited 4K synced cinema, verified arcade games, and private desks.</p>

            <button className="btn-continue" onClick={onClose}>
              Enter CoGether Hub <Sparkles size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
