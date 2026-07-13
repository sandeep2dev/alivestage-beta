'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { setAccessToken } from '@/lib/auth';
import styles from './auth.module.css';

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function sendOtp(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await apiFetch('/api/auth/send-otp', {
        method: 'POST',
        body: { email },
      });
      setMessage('Check your email for the one-time passcode.');
      setStep('otp');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/api/auth/verify-otp', {
        method: 'POST',
        body: { email, otp },
      });

      setAccessToken(data.accessToken);
      const profile = data.profile;
      const artistDetails = data.artistDetails;

      if (!profile?.onboarding_complete) {
        router.push('/onboarding/role');
        return;
      }

      if (profile?.role === 'artist' && !artistDetails?.is_onboarded) {
        router.push('/onboarding');
        return;
      }

      if (['admin', 'superadmin'].includes(profile?.role)) {
        router.push('/admin');
        return;
      }

      router.push('/dashboard');
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
        <h1 className="pageTitle">Sign In</h1>
        <p className={styles.subtitle}>Passwordless login with email OTP</p>

        {error && <div className="alert alertError">{error}</div>}
        {message && <div className="alert alertSuccess">{message}</div>}

        {step === 'email' ? (
          <form onSubmit={sendOtp}>
            <div className="formGroup">
              <label className="label" htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </div>
            <button type="submit" className="btn btnPrimary" disabled={loading}>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp}>
            <div className="formGroup">
              <label className="label" htmlFor="otp">One-time passcode</label>
              <input
                id="otp"
                type="text"
                className="input"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                placeholder="Enter 6-digit code"
              />
            </div>
            <button type="submit" className="btn btnPrimary" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </button>
            <button
              type="button"
              className={`btn btnSecondary ${styles.backBtn}`}
              onClick={() => setStep('email')}
            >
              Use different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
