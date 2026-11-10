import React from 'react';
import type { AppViewMode, DiscordUser } from '../lib/types.js';
import { LogoIcon } from './LogoIcon.js';
import { VerifiedSticker } from './VerifiedSticker.js';

interface NavbarProps {
  currentView: AppViewMode;
  onSelectView: (view: AppViewMode) => void;
  user: DiscordUser | null;
  onOpenAuthModal: () => void;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onSelectView,
  user,
  onOpenAuthModal,
  onSignOut,
}) => {
  const isAdmin = Boolean(
    user &&
      (user.id === '1568826229006540882' ||
        user.username.toLowerCase() === 'heysoybruno09' ||
        user.username.toLowerCase() === 'heysoybruno099' ||
        user.username.toLowerCase() === 'bru' ||
        user.role === 'admin')
  );

  return (
    <header className="site-header">
      <div className="header-inner">
        {/* Brand with lowercase geometric 'b' logo and clean BruLyrics title */}
        <div className="brand-group" onClick={() => onSelectView('discover')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            className="brand-logo-badge"
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              backgroundColor: '#18181f',
              border: '1px solid #2e2e38',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LogoIcon size={20} color="#ffffff" />
          </div>
          <div className="brand-text">
            <span className="brand-name" style={{ letterSpacing: '-0.02em', fontWeight: 700 }}>BruLyrics</span>
            <span className="brand-sub">Syllable Sync</span>
          </div>
        </div>

        {/* Center Navigation Links - Terms of Service removed as requested */}
        <nav className="nav-menu">
          <button
            type="button"
            className={`nav-tab ${currentView === 'discover' ? 'active' : ''}`}
            onClick={() => onSelectView('discover')}
          >
            Discover &amp; Player
          </button>

          <button
            type="button"
            className={`nav-tab ${currentView === 'studio' ? 'active' : ''}`}
            onClick={() => {
              if (user) {
                onSelectView('studio');
              } else {
                onOpenAuthModal();
              }
            }}
          >
            Add Lyrics
            {!user && <span className="nav-tag-badge">Sign-in Only</span>}
          </button>

          {/* Profile Tab */}
          <button
            type="button"
            className={`nav-tab ${currentView === 'profile' ? 'active' : ''}`}
            onClick={() => {
              if (user) {
                onSelectView('profile');
              } else {
                onOpenAuthModal();
              }
            }}
          >
            Profile
          </button>

          {/* Dedicated Admin Panel - STRICTLY heysoybruno09 ONLY */}
          {isAdmin && (
            <button
              type="button"
              className={`nav-tab ${currentView === 'admin' ? 'active' : ''}`}
              onClick={() => onSelectView('admin')}
              style={{
                color: currentView === 'admin' ? '#4ade80' : '#86efac',
                fontWeight: 600,
              }}
            >
              Admin Panel
            </button>
          )}
        </nav>

        {/* Right Auth Area */}
        <div className="auth-group">
          {user ? (
            <div className="user-profile-bar" onClick={() => onSelectView('profile')} style={{ cursor: 'pointer' }}>
              {user.avatar ? (
                <img src={user.avatar} alt={user.username} className="user-avatar" />
              ) : (
                <div className="user-avatar-placeholder">
                  {user.username.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="user-info-text" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="user-name">@{user.username}</span>
                <VerifiedSticker tier={isAdmin ? 'admin' : 'contributor'} size="sm" />
              </div>

              <button
                type="button"
                className="btn-ghost-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onSignOut();
                }}
                title="Sign out"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn-discord-login"
              onClick={onOpenAuthModal}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              Sign in with Discord
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
