import React, { useState } from 'react';
import { buildDiscordOAuthUrl, createMockVerifiedUser } from '../lib/discord-auth.js';
import type { DiscordUser } from '../lib/types.js';

interface DiscordAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: DiscordUser) => void;
}

export const DiscordAuthModal: React.FC<DiscordAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [customUsername, setCustomUsername] = useState('Bru');

  if (!isOpen) return null;

  const handleOAuthRedirect = () => {
    window.location.href = buildDiscordOAuthUrl();
  };

  const handleDevSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    const user = createMockVerifiedUser(customUsername.trim() || 'Bru');
    onSuccess(user);
    onClose();
  };

  return (
    <div className="auth-modal-overlay" role="dialog" aria-modal="true">
      <div className="auth-modal-card">
        {/* Header */}
        <div className="auth-modal-header">
          <div className="auth-icon-badge">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
          </div>
          <div>
            <h3 className="auth-modal-title">Sign in to Add Lyrics</h3>
            <p className="auth-modal-sub">Contributor access and verification</p>
          </div>
          <button
            type="button"
            className="auth-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854z" />
            </svg>
          </button>
        </div>

        {/* Notice Info Box */}
        <div className="auth-notice-card">
          <div className="auth-notice-header">
            <span className="auth-badge-notice">POLICY NOTICE</span>
            <strong>Open Exploration Guarantee</strong>
          </div>
          <p className="auth-notice-text">
            Song discovery, search, and in-browser music playback with live synchronized lyrics are completely open to all visitors without any sign-up or login.
          </p>
          <p className="auth-notice-text" style={{ marginTop: 8 }}>
            Discord authentication is strictly required only when you want to add, synchronize, or edit lyrics in the studio, ensuring verified creator attribution and spam protection.
          </p>
        </div>

        {/* Primary OAuth Button */}
        <button
          type="button"
          className="btn-discord-primary"
          onClick={handleOAuthRedirect}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
          </svg>
          Authorize with Discord (OAuth2)
        </button>

        <div className="auth-modal-divider">
          <span>OR QUICK CREATOR AUTHORIZATION</span>
        </div>

        {/* Developer Instant Authorization */}
        <form className="auth-dev-form" onSubmit={handleDevSignIn}>
          <div className="form-field">
            <label className="form-label">Contributor Username</label>
            <input
              type="text"
              className="text-input"
              value={customUsername}
              onChange={(e) => setCustomUsername(e.target.value)}
              placeholder="e.g. Bru, LyricistPro..."
              required
            />
          </div>
          <button type="submit" className="btn-secondary-full">
            Enter Sync Studio as @{customUsername.trim() || 'Bru'} (Verified)
          </button>
        </form>
      </div>
    </div>
  );
};
