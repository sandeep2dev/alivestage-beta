'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import FormAlert from '@/components/FormAlert/FormAlert';
import FormField from '@/components/FormField/FormField';
import { apiFetch } from '@/lib/api';
import { getAccessToken, setAccessToken, clearAccessToken } from '@/lib/auth';
import styles from './onboarding.module.css';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [form, setForm] = useState({
    name: '',
    city: '',
    pincode: '',
    discordUsername: '',
  });
  const [otp, setOtp] = useState('');
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    async function load() {
      const token = getAccessToken();
      if (!token) {
        router.replace('/auth');
        return;
      }
      try {
        const data = await apiFetch('/api/auth/me', { token });
        const p = data.profile;
        setInviteUrl(data.discordInviteUrl || '');
        setForm({
          name: p.name || '',
          city: p.city || '',
          pincode: p.pincode || '',
          discordUsername: p.discord_username || '',
        });
        if (p.verified_at && p.onboarding_complete) {
          router.replace('/');
          return;
        }
        if (p.discord_username && p.city && p.pincode && !p.verified_at) {
          setStep('discord');
        }
      } catch {
        clearAccessToken();
        router.replace('/auth');
      }
    }
    load();
  }, [router]);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  async function saveProfile(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const token = getAccessToken();
      const data = await apiFetch('/api/auth/onboarding', {
        method: 'POST',
        token,
        body: {
          name: form.name,
          city: form.city,
          pincode: form.pincode,
          discord_username: form.discordUsername,
        },
      });
      if (data.accessToken) setAccessToken(data.accessToken);
      setInviteUrl(data.discordInviteUrl || inviteUrl);
      if (data.next === 'done') {
        router.push('/');
        return;
      }
      setStep('discord');
      setMessage('Join the Discord server, then request a DM code.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function sendDiscordOtp() {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const token = getAccessToken();
      const data = await apiFetch('/api/auth/discord/send-otp', {
        method: 'POST',
        token,
        body: { discord_username: form.discordUsername },
      });
      setMessage(
        data.mock
          ? 'Dev mode: check the API console for the Discord OTP.'
          : 'Check your Discord DMs for a 6-digit code.'
      );
      setResendIn(60);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyDiscord(e) {
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
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`container ${styles.page}`}>
      <div className={`card ${styles.card}`}>
        <h1 className="pageTitle">Join the community</h1>
        <p className={styles.subtitle}>
          Email is just an entry point. Discord verification is your identity on AliVeStage.
        </p>

        <FormAlert type="error">{error}</FormAlert>
        <FormAlert type="success">{message}</FormAlert>

        {step === 'profile' ? (
          <form onSubmit={saveProfile} noValidate>
            <FormField id="name" label="Display name" required>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </FormField>
            <FormField id="city" label="City" required>
              <input
                className="input"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                required
              />
            </FormField>
            <FormField id="pincode" label="Pincode" required hint="6-digit Indian pincode">
              <input
                className="input"
                value={form.pincode}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    pincode: e.target.value.replace(/\D/g, '').slice(0, 6),
                  }))
                }
                inputMode="numeric"
                required
              />
            </FormField>
            <FormField id="discord" label="Discord username" required>
              <input
                className="input"
                value={form.discordUsername}
                onChange={(e) =>
                  setForm((f) => ({ ...f, discordUsername: e.target.value.replace(/^@/, '') }))
                }
                placeholder="yourname"
                required
              />
            </FormField>
            <button type="submit" className="btn btnPrimary" disabled={loading}>
              {loading ? 'Saving…' : 'Continue'}
            </button>
          </form>
        ) : (
          <div className={styles.discordStep}>
            <ol className={styles.steps}>
              <li>
                Join the AliVeStage Discord{' '}
                {inviteUrl ? (
                  <a href={inviteUrl} target="_blank" rel="noreferrer">
                    server invite
                  </a>
                ) : (
                  'server'
                )}
                .
              </li>
              <li>Request a DM OTP below (allow DMs from server members).</li>
              <li>Paste the 6-digit code to verify.</li>
            </ol>

            <button
              type="button"
              className="btn btnSecondary"
              onClick={sendDiscordOtp}
              disabled={loading || resendIn > 0}
            >
              {resendIn > 0 ? `Resend in ${resendIn}s` : 'Send Discord OTP'}
            </button>

            <form onSubmit={verifyDiscord} noValidate>
              <FormField id="otp" label="Discord OTP" required>
                <input
                  className="input"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6-digit code"
                />
              </FormField>
              <button
                type="submit"
                className="btn btnPrimary"
                disabled={loading || otp.length !== 6}
              >
                {loading ? 'Verifying…' : 'Verify Discord'}
              </button>
            </form>

            <button
              type="button"
              className="btn btnSecondary"
              onClick={() => setStep('profile')}
              disabled={loading}
            >
              Edit profile details
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
