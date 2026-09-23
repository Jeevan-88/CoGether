import React, { useState, useEffect } from 'react';
import { Shield, Users, Sparkles, ArrowRight, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../core/AuthContext.jsx';
import { API_URL } from '../../config/api.js';

const API_BASE = API_URL;

export default function InviteLandingView({ token, onJoinRoom, onCancel }) {
  const { user, profile, isAuthenticated } = useAuth();

  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemed, setRedeemed] = useState(false);

  useEffect(() => {
    async function fetchInvite() {
      if (!token) {
        setError('No invite token provided.');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/v1/invites/${encodeURIComponent(token)}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.message || data.error || 'Invalid or expired invite token.');
        } else {
          setPreview(data);
        }
      } catch (err) {
        setError('Could not connect to identity cluster to resolve invite.');
      } finally {
        setLoading(false);
      }
    }

    fetchInvite();
  }, [token]);

  const handleRedeem = async () => {
    setRedeeming(true);
    setError(null);

    try {
      const accessToken = localStorage.getItem('cogether_access_token');
      const res = await fetch(`${API_BASE}/api/v1/invites/${encodeURIComponent(token)}/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        }
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || data.error || 'Redemption failed.');
        setRedeeming(false);
        return;
      }

      setRedeemed(true);
      setTimeout(() => {
        if (onJoinRoom) {
          onJoinRoom({
            roomId: data.resourceId || preview?.resourceId || 'squad-room',
            resourceType: data.resourceType || preview?.resourceType
          });
        }
      }, 1200);
    } catch (err) {
      setError('Network error during redemption.');
      setRedeeming(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#09090b',
        color: '#fff'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '3px solid rgba(255,229,0,0.2)',
            borderTopColor: '#FFE500',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px auto'
          }} />
          <p style={{ color: '#94a3b8', fontSize: '14px', letterSpacing: '1px' }}>
            RESOLVING CRYPTOGRAPHIC INVITE...
          </p>
        </div>
      </div>
    );
  }

  if (error || !preview) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#09090b',
        color: '#fff',
        padding: '24px'
      }}>
        <div style={{
          maxWidth: '440px',
          width: '100%',
          background: '#14141a',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '16px',
          padding: '32px 24px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            color: '#ef4444'
          }}>
            <AlertTriangle size={28} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Invite Unavailable</h2>
          <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: '1.5', marginBottom: '24px' }}>
            {error || 'This invite link is invalid, expired, or has reached its usage limit.'}
          </p>
          <button
            onClick={onCancel}
            style={{
              padding: '10px 24px',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Return to CoGether Home
          </button>
        </div>
      </div>
    );
  }

  const inviter = preview.inviter || {};

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at top, #1c1c24 0%, #09090b 100%)',
      color: '#fff',
      padding: '24px'
    }}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        background: '#14141a',
        border: '1px solid rgba(255, 229, 0, 0.25)',
        borderRadius: '20px',
        padding: '36px 28px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255, 229, 0, 0.1)',
            border: '1px solid rgba(255, 229, 0, 0.3)',
            borderRadius: '20px',
            padding: '4px 12px',
            fontSize: '11px',
            fontWeight: '700',
            letterSpacing: '1.5px',
            color: '#FFE500',
            marginBottom: '16px'
          }}>
            <Shield size={12} />
            <span>VERIFIED SQUAD INVITATION</span>
          </div>

          {/* Inviter Avatar & Handle */}
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: inviter.avatar_url ? `url(${inviter.avatar_url}) center/cover` : '#27272a',
            border: '3px solid #FFE500',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px auto',
            fontSize: '24px',
            fontWeight: '700',
            color: '#FFE500'
          }}>
            {!inviter.avatar_url && (inviter.display_name?.[0]?.toUpperCase() || 'U')}
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 4px 0' }}>
            {inviter.display_name || inviter.username || 'A friend'}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
            @{inviter.username || 'user'} invited you to join them on CoGether
          </p>
        </div>

        {/* Room / Target Card */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b' }}>
              TARGET EXPERIENCE
            </span>
            <span style={{
              fontSize: '11px',
              padding: '2px 8px',
              background: 'rgba(34, 197, 94, 0.1)',
              color: '#4ade80',
              borderRadius: '12px',
              border: '1px solid rgba(34, 197, 94, 0.3)'
            }}>
              Active & Valid
            </span>
          </div>

          <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} color="#FFE500" />
            <span>Room ID: {preview.resourceId || 'Squad Session'}</span>
          </div>

          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>
            Remaining redemptions: {preview.usesRemaining}
          </div>
        </div>

        {redeemed ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '14px',
            background: 'rgba(34, 197, 94, 0.2)',
            borderRadius: '10px',
            color: '#4ade80',
            fontWeight: '700',
            fontSize: '14px'
          }}>
            <CheckCircle size={18} />
            <span>Invite Redeemed! Launching room...</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={handleRedeem}
              disabled={redeeming}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '14px',
                background: '#FFE500',
                color: '#000000',
                border: 'none',
                borderRadius: '10px',
                fontWeight: '800',
                fontSize: '14px',
                cursor: 'pointer',
                letterSpacing: '0.5px'
              }}
            >
              {redeeming ? 'Redeeming Pass...' : 'Accept Invitation & Enter'} <ArrowRight size={16} />
            </button>

            <button
              onClick={onCancel}
              style={{
                width: '100%',
                padding: '10px',
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Decline & Go Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
