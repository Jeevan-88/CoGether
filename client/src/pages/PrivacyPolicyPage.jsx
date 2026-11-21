import React from 'react';
import { ShieldCheck, Lock, EyeOff, Server, ArrowLeft, Home } from 'lucide-react';
import './AuthStyles.css';

export default function PrivacyPolicyPage({ onNavigate }) {
  const navigateTo = (path) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div className="auth-page-container" style={{ minHeight: '100vh', padding: '40px 16px', alignItems: 'flex-start' }}>
      <div className="auth-page-card" style={{ maxWidth: '820px', textAlign: 'left', padding: '40px' }}>
        <button
          type="button"
          onClick={() => navigateTo('/')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: '20px'
          }}
        >
          <ArrowLeft size={16} /> Back to CoGether
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'rgba(34, 197, 94, 0.15)',
            color: '#22c55e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', margin: 0 }}>
              CoGether Privacy Policy
            </h1>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Last updated: November 2026 · Effective immediately</span>
          </div>
        </div>

        <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '24px' }}>
          At CoGether, privacy is built directly into our protocol architecture. We empower friends, couples, and teams to watch movies, play retro games, shop, and study together in real time without invasive tracking or surveillance.
        </p>

        <section style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
            1. Zero Video/Audio Recording Policy
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6 }}>
            Your real-time camera streams, microphone feeds, and telepresence overlays are transmitted peer-to-peer via WebRTC or routed ephemeral SFU instances with DTLS-SRTP encryption. CoGether never records, inspects, or saves your live streams to any disk or external cloud store.
          </p>
        </section>

        <section style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
            2. End-to-End Encrypted Party Chat
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6 }}>
            In-room text and reaction messages leverage client-side ECDH key exchange and AES-256-GCM encryption. Message bodies are decrypted only on connected participants' devices.
          </p>
        </section>

        <section style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
            3. Information We Collect
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6 }}>
            We only collect information essential for your account identity:
          </p>
          <ul style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.8, paddingLeft: '20px' }}>
            <li>Account credentials: email address and cryptographic Argon2id password hash.</li>
            <li>Profile metadata: chosen display name, unique handle, and 2D avatar configuration parameters.</li>
            <li>Operational metrics: anonymous server latency and crash telemetry without IP linkage.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
            4. Cookies & Local Storage
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6 }}>
            We do not use advertising or third-party tracking cookies. We utilize strictly necessary HttpOnly cookies (<code style={{ color: '#38bdf8' }}>cogether_access</code>, <code style={{ color: '#38bdf8' }}>cogether_refresh</code>) to maintain secure session state and defend against CSRF attacks.
          </p>
        </section>

        <section style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
            5. Your Rights & Permanent Account Deletion
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6 }}>
            Under GDPR and CCPA, you hold the absolute right to export, modify, or permanently erase your data. You may click the <strong style={{ color: '#ef4444' }}>Delete Account</strong> button in your Profile Settings or Account Dashboard at any time to purge all your records, avatars, and active sessions across our cluster.
          </p>
        </section>

        <div style={{
          padding: '16px',
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>
            Questions about our privacy infrastructure? Contact security@cogether.tech
          </span>
          <button
            type="button"
            onClick={() => navigateTo('/')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: '#22c55e',
              border: 'none',
              color: '#000',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}
