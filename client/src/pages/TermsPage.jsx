import React from 'react';
import { FileText, ArrowLeft, CheckCircle2 } from 'lucide-react';
import './AuthStyles.css';

export default function TermsPage({ onNavigate }) {
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
            background: 'rgba(59, 130, 246, 0.15)',
            color: '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <FileText size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', margin: 0 }}>
              CoGether Terms of Service
            </h1>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Version 2.4 · Effective November 2026</span>
          </div>
        </div>

        <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '24px' }}>
          Welcome to CoGether. By accessing our platform, creating an account, or joining any interactive room across CoWatch, CoPlay, CoShop, or CoStudy, you agree to comply with these terms.
        </p>

        <section style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
            1. Service Architecture & Room Rules
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6 }}>
            CoGether provides private, invite-only collaborative spaces. You are responsible for any party invite links you generate or share. Users must refrain from harassment, hate speech, unauthorized commercial broadcasting, or disrupting live game duels and synchronized study rooms.
          </p>
        </section>

        <section style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
            2. CoWatch & Content DRM Compliance
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6 }}>
            CoWatch provides dual-track playback orchestration:
          </p>
          <ul style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.8, paddingLeft: '20px' }}>
            <li><strong>Track 1 (Direct Sync):</strong> When room participants hold their own legitimate subscription accounts (e.g., Netflix, Crunchyroll), playback state is synchronized directly on their respective devices without transmitting protected audio/video bytes.</li>
            <li><strong>Track 2 (Authorized Screen Sharing):</strong> When users share personal browser windows or licensed public domain cinema, users agree not to circumvent hardware DRM restrictions or engage in unauthorized piracy.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
            3. CoShop Collaborative Carts & Shared Checkouts
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6 }}>
            Items added to shared carts in CoShop Live are subject to partner merchant availability and prices. CoGether coordinates shared billing splits via certified payment gateways; we do not store raw credit card numbers or banking credentials.
          </p>
        </section>

        <section style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
            4. Fair Play in CoPlay Arcade
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6 }}>
            All multiplayer game interactions (2048 duels, Tic Tac Toe, Block Puzzle) are synchronized over deterministic state protocols. Any attempt to inject automated cheating scripts, spoof scores, or exploit network latency will result in account suspension.
          </p>
        </section>

        <section style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
            5. Termination & Account Erasure
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6 }}>
            You may terminate your account at any time using the Delete Account option in your settings. CoGether reserves the right to suspend accounts that violate safety guidelines or compromise platform integrity.
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
            By continuing to use CoGether, you agree to these Terms.
          </span>
          <button
            type="button"
            onClick={() => navigateTo('/')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: '#3b82f6',
              border: 'none',
              color: '#fff',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Agree & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
