'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { setAccessToken } from '@/lib/auth';
import { isEmail, isOtp } from '@/lib/validators';
import FormAlert from '@/components/FormAlert/FormAlert';
import FormField from '@/components/FormField/FormField';
import styles from './auth.module.css';

const RESEND_SECONDS = 30;

export default function AuthPage() {
  const router = useRouter();
  const otpRef = useRef(null);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (step !== 'otp' || resendIn <= 0) return undefined;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [step, resendIn]);

  useEffect(() => {
    if (step === 'otp') {
      otpRef.current?.focus();
    }
  }, [step]);

  async function requestOtp(normalizedEmail) {
    await apiFetch('/api/auth/send-otp', {
      method: 'POST',
      body: { email: normalizedEmail },
    });
    setEmail(normalizedEmail);
    setMessage(`We sent a 6-digit code to ${normalizedEmail}.`);
    setStep('otp');
    setResendIn(RESEND_SECONDS);
    setOtp('');
  }

  async function sendOtp(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    setFieldErrors({});

    const emailCheck = isEmail(email);
    if (!emailCheck.ok) {
      setFieldErrors({ email: emailCheck.message });
      setLoading(false);
      return;
    }

    try {
      await requestOtp(emailCheck.value);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    if (resendIn > 0 || loading) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const emailCheck = isEmail(email);
      if (!emailCheck.ok) {
        setStep('email');
        setFieldErrors({ email: emailCheck.message });
        return;
      }
      await requestOtp(emailCheck.value);
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
    setMessage('');
    setFieldErrors({});

    const otpCheck = isOtp(otp);
    if (!otpCheck.ok) {
      setFieldErrors({ otp: otpCheck.message });
      setLoading(false);
      return;
    }

    try {
      const data = await apiFetch('/api/auth/verify-otp', {
        method: 'POST',
        body: { email, otp: otpCheck.value },
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

  function backToEmail() {
    setStep('email');
    setOtp('');
    setMessage('');
    setError('');
    setFieldErrors({});
    setResendIn(0);
  }

  const otpValid = isOtp(otp).ok;

  return (
    <div className={`container ${styles.page}`}>
      <div className={`card ${styles.card}`}>
        <h1 className="pageTitle">Sign In</h1>
        <p className={styles.subtitle}>Passwordless login with email OTP</p>

        <FormAlert type="error">{error}</FormAlert>
        <FormAlert type="success">{message}</FormAlert>

        {step === 'email' ? (
          <form onSubmit={sendOtp} noValidate>
            <FormField id="email" label="Email address" required error={fieldErrors.email}>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
              />
            </FormField>
            <button type="submit" className="btn btnPrimary" disabled={loading}>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} noValidate>
            <FormField
              id="otp"
              label="One-time passcode"
              required
              error={fieldErrors.otp}
              hint={`Sent to ${email}`}
            >
              <input
                ref={otpRef}
                type="text"
                className="input"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                pattern="[0-9]{6}"
                placeholder="6-digit code"
              />
            </FormField>
            <button type="submit" className="btn btnPrimary" disabled={loading || !otpValid}>
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </button>
            <button
              type="button"
              className={`btn btnSecondary ${styles.backBtn}`}
              onClick={resendOtp}
              disabled={loading || resendIn > 0}
            >
              {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
            </button>
            <button
              type="button"
              className={`btn btnSecondary ${styles.backBtn}`}
              onClick={backToEmail}
              disabled={loading}
            >
              Use different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
