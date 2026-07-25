'use client';

import { useEffect, useState } from 'react';
import FormAlert from '@/components/FormAlert/FormAlert';
import FormField from '@/components/FormField/FormField';
import { apiFetch } from '@/lib/api';
import { getAccessToken, setAccessToken } from '@/lib/auth';
import styles from './DiscordVerifyGate.module.css';

/**
 * Modal gate: verify Discord before a paid host/join action can proceed.
 */
export default function DiscordVerifyGate({ open, inviteUrl: inviteProp, onVerified, onCancel }) {
  const [inviteUrl, setInviteUrl] = useState(inviteProp || '');
  const [discordUsername, setDiscordUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (!open) return undefined;
    setError('');
    setMessage('');
    setOtp('');
    setResendIn(0);

    async function preload() {
      try {
        const token = getAccessToken();
        const data = await apiFetch('/api/auth/me', { token });
        setInviteUrl(inviteProp || data.discordInviteUrl || '');
        if (data.profile?.discord_username) {
          setDiscordUsername(data.profile.discord_username);
        }
      } catch {
        // ignore — user can still type username
      }
    }
    preload();
    return undefined;
  }, [open, inviteProp]);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  if (!open) return null;

  async function sendOtp() {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const token = getAccessToken();
      const data = await apiFetch('/api/auth/discord/send-otp', {
        method: 'POST',
        token,
        body: { discord_username: discordUsername },
      });
      if (data.inviteUrl) setInviteUrl(data.inviteUrl);
      setMessage(
        data.mock
          ? 'Dev mode: check the API console for the Discord OTP.'
          : 'Check your Discord DMs for a 6-digit code.'
      );
      setResendIn(60);
    } catch (err) {
      setError(err.message);
      if (err.inviteUrl) setInviteUrl(err.inviteUrl);
    } finally {
      setLoading(false);
    }
  }

  async function verify(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const token = getAccessToken();
      const data = await apiFetch('/api/auth/discord/verify-otp', {
        method: 'POST',
        token,
        body: { otp },
      });
      if (data.accessToken) setAccessToken(data.accessToken);
      onVerified?.(data.profile);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.overlay} role="presentation" onClick={onCancel}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="discord-verify-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="discord-verify-title" className={styles.title}>
          Verify via Discord to continue
        </h2>
        <p className={styles.copy}>
          Payment actions require Discord verification. Join the Alivestage server, then confirm
          your username with a DM code.
        </p>

        <FormAlert type="error">{error}</FormAlert>
        <FormAlert type="success">{message}</FormAlert>

        <ol className={styles.steps}>
          <li>
            Join the server{' '}
            {inviteUrl ? (
              <a href={inviteUrl} target="_blank" rel="noreferrer">
                via this invite
              </a>
            ) : (
              '(invite link from your host)'
            )}
            .
          </li>
          <li>Enter your Discord username and request a DM OTP.</li>
          <li>Paste the code below. After success, we&apos;ll continue to payment.</li>
        </ol>

        <FormField id="discord-username" label="Discord username" required>
          <input
            className="input"
            value={discordUsername}
            onChange={(e) => setDiscordUsername(e.target.value.replace(/^@/, ''))}
            placeholder="yourname"
            disabled={loading}
          />
        </FormField>

        <button
          type="button"
          className="btn btnSecondary"
          onClick={sendOtp}
          disabled={loading || resendIn > 0 || discordUsername.trim().length < 2}
        >
          {resendIn > 0 ? `Resend in ${resendIn}s` : 'Send Discord OTP'}
        </button>

        <form onSubmit={verify} className={styles.form}>
          <FormField id="discord-otp" label="OTP from Discord DM" required>
            <input
              className="input"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              maxLength={6}
              placeholder="6-digit code"
              disabled={loading}
            />
          </FormField>
          <div className={styles.actions}>
            <button type="button" className="btn btnSecondary" onClick={onCancel} disabled={loading}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btnPrimary"
              disabled={loading || otp.length !== 6}
            >
              {loading ? 'Verifying…' : 'Verify & continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
