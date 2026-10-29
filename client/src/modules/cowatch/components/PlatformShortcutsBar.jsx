import React from 'react';
import { 
  Film, PlaySquare, Tv, Video, Star, Flame, 
  MonitorPlay, Laptop, Link2, Trophy, Radio, ChevronRight 
} from 'lucide-react';
import './PlatformShortcutsBar.css';

export const SHORTCUTS = [
  { id: 'FREE_MOVIES', name: 'Free Movies', icon: Film, color: '#22c55e', badge: '100% Free' },
  { id: 'YOUTUBE', name: 'YouTube', icon: PlaySquare, color: '#ef4444', badge: 'Embed' },
  { id: 'NETFLIX', name: 'Netflix', icon: Tv, color: '#e50914', badge: 'Companion' },
  { id: 'PRIME_VIDEO', name: 'Prime Video', icon: Video, color: '#00a8e1', badge: 'Companion' },
  { id: 'DISNEY_HOTSTAR', name: 'Disney+ Hotstar', icon: Star, color: '#113ccf', badge: 'Companion' },
  { id: 'CRUNCHYROLL', name: 'Crunchyroll', icon: Flame, color: '#f97316', badge: 'Companion' },
  { id: 'JIOCINEMA', name: 'JioCinema', icon: MonitorPlay, color: '#c9293a', badge: 'Companion' },
  { id: 'APPLE_TV', name: 'Apple TV+', icon: Laptop, color: '#a2aaad', badge: 'Companion' },
  { id: 'CUSTOM_LINKS', name: 'Custom Links', icon: Link2, color: '#a855f7', badge: 'Any URL' },
  { id: 'SPORTS', name: 'Sports', icon: Trophy, color: '#eab308', badge: 'Live' },
  { id: 'LIVE_TV', name: 'Live TV', icon: Radio, color: '#06b6d4', badge: '24/7' }
];

export default function PlatformShortcutsBar({ onSelectPlatform }) {
  return (
    <section className="cowatch-shortcuts-section" aria-label="Platform Shortcuts">
      <div className="cowatch-shortcuts-header">
        <span className="shortcuts-kicker">STREAMING HUB</span>
        <h3 className="shortcuts-heading">Explore by Platform</h3>
      </div>
      <div className="cowatch-shortcuts-track">
        {SHORTCUTS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className="cowatch-shortcut-card"
              onClick={() => onSelectPlatform && onSelectPlatform(item.id)}
              style={{ '--accent-clr': item.color }}
            >
              <div className="shortcut-icon-wrapper" style={{ background: `${item.color}18`, borderColor: `${item.color}35` }}>
                <Icon size={18} style={{ color: item.color }} />
              </div>
              <div className="shortcut-meta">
                <span className="shortcut-name">{item.name}</span>
                <span className="shortcut-badge" style={{ color: item.color, borderColor: `${item.color}40`, background: `${item.color}12` }}>
                  {item.badge}
                </span>
              </div>
              <ChevronRight size={14} className="shortcut-chevron" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
