import React, { useState } from 'react';
import { buildDiscordOAuthUrl } from '../lib/discord-auth.js';
import type { DiscordUser } from '../lib/types.js';

interface DiscordAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: DiscordUser) => void;
  onViewTerms?: () => void;
}

export const DiscordAuthModal: React.FC<DiscordAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onViewTerms,
}) => {
  const [hasAgreed, setHasAgreed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('brus_lyrics_legal_agreed') === 'true';
    }
    return false;
  });

  if (!isOpen) return null;

  const handleAgree = () => {
    setHasAgreed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('brus_lyrics_legal_agreed', 'true');
    }
    // Proceed directly to Discord OAuth
    window.location.href = buildDiscordOAuthUrl();
  };

  const handleDontAgree = () => {
    // User cannot proceed without agreeing
    setHasAgreed(false);
    onClose();
  };

  const handleTermsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onClose();
    if (onViewTerms) {
      onViewTerms();
    } else if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/terms');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
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
            <h3 className="auth-modal-title">Sign in with Discord</h3>
            <p className="auth-modal-sub">Contributor access and attribution</p>
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

        {/* Terms of Service Acceptance Pop-up Box */}
        <div className="auth-notice-card" style={{ border: '1px solid #3e3e4a', backgroundColor: '#131318' }}>
          <div className="auth-notice-header" style={{ marginBottom: 10 }}>
            <span className="auth-badge-notice">TERMS OF SERVICE REQUIREMENT</span>
          </div>

          <p style={{ fontSize: 14, color: '#f4f4f6', lineHeight: 1.5, margin: '8px 0 14px 0' }}>
            <a
              href="/terms"
              onClick={handleTermsClick}
              style={{
                color: '#60a5fa',
                textDecoration: 'underline',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Read the Terms and Conditions of this
            </a>
          </p>

          <p className="auth-notice-text" style={{ fontSize: 12, color: '#9e9ea8', lineHeight: 1.5 }}>
            To protect copyright attribution and prevent spam, signing in with Discord requires agreeing to the International Terms of Service and Intermediary Safe Harbor policy. You cannot proceed with login without clicking &quot;Agree&quot;.
          </p>
        </div>

        {/* Action Buttons: "Agree" or "Don't Agree" */}
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button
            type="button"
            className="btn-discord-primary"
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={handleAgree}
          >
            Agree
          </button>
          <button
            type="button"
            className="btn-secondary"
            style={{
              flex: 1,
              backgroundColor: '#1c1c24',
              borderColor: '#2e2e38',
              color: '#a1a1aa',
              padding: '12px 20px',
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
            onClick={handleDontAgree}
          >
            Don&apos;t Agree
          </button>
        </div>

        {/* Open Exploration Note */}
        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 11, color: '#71717a' }}>
          Browsing, searching, and listening to songs with synchronized lyrics remain open to all visitors without logging in.
        </div>
      </div>
    </div>
  );
};

export default DiscordAuthModal;
