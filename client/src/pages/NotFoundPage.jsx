import React from 'react';
import { Compass, Home, Tv, Gamepad2, ShoppingBag, BookOpen, ArrowLeft } from 'lucide-react';
import './AuthStyles.css';

export default function NotFoundPage({ onNavigate, onSelectService }) {
  const navigateTo = (path) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-page-card" style={{ maxWidth: '580px', textAlign: 'center', padding: '48px 32px' }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px'
        }}>
          <Compass size={36} />
        </div>

        <span style={{
          display: 'inline-block',
          padding: '4px 12px',
          borderRadius: '12px',
          background: 'rgba(255, 255, 255, 0.08)',
          fontSize: '12px',
          fontWeight: 700,
          color: '#94a3b8',
          letterSpacing: '0.08em',
          marginBottom: '12px'
        }}>
          ERROR 404
        </span>

        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#fff', margin: '0 0 10px' }}>
          Lost in Orbit
        </h1>
        <p style={{ fontSize: '15px', color: '#94a3b8', lineHeight: 1.6, margin: '0 0 32px' }}>
          The room, party, or galaxy you are looking for does not exist or has already wrapped up. Choose a service below to jump back in.
        </p>

        {/* Quick Launch Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
          gap: '12px',
          marginBottom: '32px'
        }}>
          <button
            type="button"
            onClick={() => onSelectService ? onSelectService('cowatch') : navigateTo('/')}
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '16px 8px',
              color: '#fff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}
          >
            <Tv size={20} color="#e50914" />
            <span style={{ fontSize: '12px', fontWeight: 700 }}>CoWatch</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectService ? onSelectService('coplay') : navigateTo('/')}
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '16px 8px',
              color: '#fff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}
          >
            <Gamepad2 size={20} color="#eab308" />
            <span style={{ fontSize: '12px', fontWeight: 700 }}>CoPlay</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectService ? onSelectService('coshop') : navigateTo('/')}
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '16px 8px',
              color: '#fff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}
          >
            <ShoppingBag size={20} color="#22c55e" />
            <span style={{ fontSize: '12px', fontWeight: 700 }}>CoShop</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectService ? onSelectService('costudy') : navigateTo('/')}
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '16px 8px',
              color: '#fff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}
          >
            <BookOpen size={20} color="#3b82f6" />
            <span style={{ fontSize: '12px', fontWeight: 700 }}>CoStudy</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => navigateTo('/')}
          className="auth-btn-primary"
          style={{ width: 'auto', padding: '12px 28px', margin: '0 auto', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <Home size={16} /> Return to Homepage
        </button>
      </div>
    </div>
  );
}
