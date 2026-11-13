import React, { useState } from 'react';
import { buildDiscordOAuthUrl, createMockVerifiedUser } from '../lib/discord-auth.js';
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
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [selectedRedirect, setSelectedRedirect] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('brus_discord_redirect_uri') ||
        'https://brus-lyrics.pages.dev/auth/callback'
      );
    }
    return 'https://brus-lyrics.pages.dev/auth/callback';
  });

  if (!isOpen) return null;

  const handleAgree = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('brus_lyrics_legal_agreed', 'true');
      localStorage.setItem('brus_discord_redirect_uri', selectedRedirect);
    }
    // Proceed directly to Discord OAuth
    window.location.href = buildDiscordOAuthUrl(selectedRedirect);
  };

  const handleDontAgree = () => {
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

  const handleInstantAdmin = () => {
    const adminUser = createMockVerifiedUser('heysoybruno09');
    onSuccess(adminUser);
    onClose();
  };

  return (
    <div className="auth-modal-overlay" role="dialog" aria-modal="true">
      <div className="auth-modal-card" style={{ maxWidth: 520 }}>
        {/* Header */}
        <div className="auth-modal-header">
          <div className="auth-icon-badge">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
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

        {/* Instant Administrator Access Button for heysoybruno09 */}
        <div style={{ marginBottom: 16 }}>
          <button
            type="button"
            onClick={handleInstantAdmin}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '12px 16px',
              backgroundColor: '#16a34a',
              color: '#ffffff',
              border: '1px solid #22c55e',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(22, 163, 74, 0.25)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Instant Admin Sign-In (@heysoybruno09)</span>
          </button>
          <div style={{ fontSize: 11, color: '#71717a', textAlign: 'center', marginTop: 4 }}>
            Bypasses external OAuth redirects and immediately activates administrator permissions.
          </div>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '14px 0' }}>
          <div style={{ flex: 1, height: 1, backgroundColor: '#27272a' }} />
          <span style={{ fontSize: 11, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            or continue with discord
          </span>
          <div style={{ flex: 1, height: 1, backgroundColor: '#27272a' }} />
        </div>

        {/* Terms of Service Acceptance Pop-up Box */}
        <div className="auth-notice-card" style={{ border: '1px solid #3e3e4a', backgroundColor: '#131318', padding: 16, borderRadius: 8 }}>
          <div className="auth-notice-header" style={{ marginBottom: 8 }}>
            <span className="auth-badge-notice">TERMS OF SERVICE REQUIREMENT</span>
          </div>

          <p style={{ fontSize: 13, color: '#f4f4f6', lineHeight: 1.5, margin: '6px 0 10px 0' }}>
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

          <p className="auth-notice-text" style={{ fontSize: 12, color: '#9e9ea8', lineHeight: 1.5, margin: 0 }}>
            To protect copyright attribution and prevent spam, signing in with Discord requires agreeing to the International Terms of Service and Intermediary Safe Harbor policy. You cannot proceed with login without clicking &quot;Agree&quot;.
          </p>
        </div>

        {/* Action Buttons: "Agree" or "Don't Agree" */}
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button
            type="button"
            className="btn-discord-primary"
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={handleAgree}
          >
            Agree &amp; Continue with Discord
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

        {/* OAuth Redirect Settings Link / Drawer */}
        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => setShowConfig((prev) => !prev)}
            style={{
              background: 'none',
              border: 'none',
              color: '#818cf8',
              fontSize: 12,
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0,
            }}
          >
            {showConfig ? 'Hide OAuth Redirect Settings' : 'Fix "Invalid OAuth2 redirect_uri" error'}
          </button>
        </div>

        {showConfig && (
          <div
            style={{
              marginTop: 12,
              padding: 14,
              backgroundColor: '#09090b',
              border: '1px solid #27272a',
              borderRadius: 8,
              fontSize: 12,
              textAlign: 'left',
            }}
          >
            <div style={{ fontWeight: 600, color: '#f4f4f6', marginBottom: 6 }}>
              Discord Developer Portal Redirect Settings
            </div>
            <p style={{ color: '#a1a1aa', margin: '0 0 10px 0', lineHeight: 1.4 }}>
              If Discord shows &quot;Invalid OAuth2 redirect_uri&quot;, select which URI is registered in your{' '}
              <a
                href="https://discord.com/developers/applications/1568826229006540882/oauth2"
                target="_blank"
                rel="noreferrer"
                style={{ color: '#60a5fa', textDecoration: 'underline' }}
              >
                Discord Developer Portal
              </a>:
            </p>

            <select
              value={selectedRedirect}
              onChange={(e) => {
                setSelectedRedirect(e.target.value);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('brus_discord_redirect_uri', e.target.value);
                }
              }}
              style={{
                width: '100%',
                padding: '8px 10px',
                backgroundColor: '#18181b',
                border: '1px solid #3f3f46',
                borderRadius: 4,
                color: '#f4f4f6',
                fontSize: 12,
                marginBottom: 10,
              }}
            >
              <option value="https://brus-lyrics.pages.dev/auth/callback">
                https://brus-lyrics.pages.dev/auth/callback (Standard)
              </option>
              <option value="https://brus-lyrics.pages.dev/callback">
                https://brus-lyrics.pages.dev/callback (Legacy)
              </option>
              <option value="https://brus-lyrics.pages.dev">
                https://brus-lyrics.pages.dev (Root)
              </option>
              <option value="http://localhost:5173/auth/callback">
                http://localhost:5173/auth/callback (Localhost)
              </option>
              <option value="http://localhost:5173">
                http://localhost:5173 (Localhost Root)
              </option>
            </select>

            <div style={{ fontSize: 11, color: '#71717a' }}>
              Add all 5 URLs to your Discord App OAuth2 Redirects for seamless sign-in everywhere.
            </div>
          </div>
        )}

        {/* Open Exploration Note */}
        <div style={{ marginTop: 14, textAlign: 'center', fontSize: 11, color: '#71717a' }}>
          Browsing, searching, and listening to songs with synchronized lyrics remain open to all visitors without logging in.
        </div>
      </div>
    </div>
  );
};

export default DiscordAuthModal;
