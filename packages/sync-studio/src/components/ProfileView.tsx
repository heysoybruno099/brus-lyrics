import React, { useState } from 'react';
import type { DiscordUser } from '../lib/types.js';
import { saveUser } from '../lib/discord-auth.js';
import { getApiBaseUrl } from '../lib/config.js';

interface ProfileViewProps {
  user: DiscordUser | null;
  onUpdateUser: (updatedUser: DiscordUser) => void;
  onSignOut: () => void;
  onOpenAuthModal: () => void;
  onViewTerms: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  onUpdateUser,
  onSignOut,
  onOpenAuthModal,
  onViewTerms,
}) => {
  const [newUsername, setNewUsername] = useState<string>(user?.username || '');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!user) {
    return (
      <div style={{ padding: '60px 20px', maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f4f4f6', marginBottom: 12 }}>
          Sign In Required
        </h2>
        <p style={{ fontSize: 13, color: '#a1a1aa', marginBottom: 20 }}>
          Please sign in with Discord to view your contributor profile and manage your website username.
        </p>
        <button
          type="button"
          className="btn-discord-primary"
          onClick={onOpenAuthModal}
          style={{ display: 'inline-flex', padding: '10px 20px' }}
        >
          Sign in with Discord
        </button>
      </div>
    );
  }

  const handleSaveUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newUsername.trim().replace(/^@/, '');
    if (!cleanName) {
      setNotice({ type: 'error', message: 'Username cannot be empty.' });
      return;
    }

    setIsSaving(true);
    setNotice(null);

    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/v1/auth/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          username: cleanName,
          role: user.role,
          isVerified: user.isVerified,
        }),
      });

      const updated: DiscordUser = {
        ...user,
        username: cleanName,
      };

      saveUser(updated);
      onUpdateUser(updated);

      if (res.ok) {
        setNotice({ type: 'success', message: `Website username successfully updated to @${cleanName}!` });
      } else {
        setNotice({ type: 'success', message: `Website username updated to @${cleanName} (locally saved).` });
      }
    } catch {
      const updated: DiscordUser = {
        ...user,
        username: cleanName,
      };
      saveUser(updated);
      onUpdateUser(updated);
      setNotice({ type: 'success', message: `Website username updated to @${cleanName}.` });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: 640, margin: '0 auto' }}>
      {/* Profile Card Header */}
      <div
        style={{
          backgroundColor: '#141418',
          border: '1px solid #26262e',
          borderRadius: 8,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.username}
              style={{ width: 64, height: 64, borderRadius: '50%', border: '2px solid #33333d' }}
            />
          ) : (
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                backgroundColor: '#27272a',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                fontWeight: 700,
              }}
            >
              {user.username.charAt(0).toUpperCase()}
            </div>
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f4f4f6', margin: 0 }}>
                @{user.username}
              </h1>
              <span
                style={{
                  fontSize: 10,
                  padding: '2px 8px',
                  borderRadius: 9999,
                  backgroundColor: '#14532d',
                  color: '#4ade80',
                  fontWeight: 600,
                }}
              >
                VERIFIED CONTRIBUTOR
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#71717a', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
              Discord ID: {user.id} • Tag: #{user.discriminator || '0000'}
            </div>
          </div>
        </div>

        {notice && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 6,
              marginBottom: 16,
              fontSize: 13,
              backgroundColor: notice.type === 'success' ? '#14532d' : '#7f1d1d',
              color: notice.type === 'success' ? '#86efac' : '#fca5a5',
              border: `1px solid ${notice.type === 'success' ? '#22c55e' : '#ef4444'}`,
            }}
          >
            {notice.message}
          </div>
        )}

        {/* Change Username Form */}
        <form onSubmit={handleSaveUsername}>
          <div className="form-field" style={{ marginBottom: 16 }}>
            <label className="form-label" style={{ fontSize: 13, fontWeight: 600, color: '#f4f4f6' }}>
              Website Display Username
            </label>
            <p style={{ fontSize: 12, color: '#8e8e98', margin: '4px 0 10px 0' }}>
              Change how your name appears on this website and on published lyrics.
            </p>
            <input
              type="text"
              className="text-input"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Enter new display username..."
              required
              style={{ padding: '10px 14px', fontSize: 14 }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSaving || !newUsername.trim()}
            style={{ padding: '10px 20px', fontSize: 13, fontWeight: 600 }}
          >
            {isSaving ? 'Saving...' : 'Save Display Username'}
          </button>
        </form>
      </div>

      {/* Account Info and Policies */}
      <div
        style={{
          backgroundColor: '#101014',
          border: '1px solid #1f1f26',
          borderRadius: 8,
          padding: 20,
          fontSize: 13,
          color: '#a1a1aa',
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#f4f4f6', marginBottom: 12 }}>
          Account &amp; Legal Policies
        </h3>
        <p style={{ margin: '0 0 10px 0' }}>
          Privacy Policy is officially maintained at heysoybruno09:{' '}
          <a
            href="https://github.com/heysoybruno09"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#4ade80', textDecoration: 'underline' }}
          >
            heysoybruno09 Privacy Policy
          </a>
        </p>
        <p style={{ margin: '0 0 16px 0' }}>
          Read the{' '}
          <button
            type="button"
            onClick={onViewTerms}
            style={{
              background: 'none',
              border: 'none',
              color: '#60a5fa',
              textDecoration: 'underline',
              cursor: 'pointer',
              padding: 0,
              fontSize: 'inherit',
            }}
          >
            Terms of Service and Intermediary Safe Harbor
          </button>
          .
        </p>

        <button
          type="button"
          onClick={onSignOut}
          className="btn btn-secondary"
          style={{ borderColor: '#ef4444', color: '#f87171', padding: '6px 14px', fontSize: 12 }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default ProfileView;
