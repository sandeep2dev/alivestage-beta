'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { getAccessToken, setAccessToken } from '@/lib/auth';
import { isOtp, isPhone } from '@/lib/validators';
import FormAlert from '@/components/FormAlert/FormAlert';
import FormField from '@/components/FormField/FormField';
import styles from './WhatsAppVerify.module.css';

/**
 * Send-code / enter-code WhatsApp verification (mirrors email OTP UX).
 * On success calls onVerified(profile).
 */
export default function WhatsAppVerify({
  initialPhone = '',
  onVerified,
  submitLabel = 'Verify & continue',
}) {
  const [phone, setPhone] = useState(initialPhone || '');
  const [otp, setOtp] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  async function sendCode(e) {
    e?.preventDefault?.();
    setError('');
    setMessage('');
    setFieldErrors({});

    const phoneCheck = isPhone(phone, { required: true });
    if (!phoneCheck.ok) {
      setFieldErrors({ phone: phoneCheck.message });
      return;
    }

    setLoading(true);
    try {
      const token = getAccessToken();
      await apiFetch('/api/auth/whatsapp/send-otp', {
        method: 'POST',
        token,
        body: { phone: phoneCheck.value },
      });
      setPhone(phoneCheck.value);
      setSent(true);
      setMessage('Code sent on WhatsApp. It expires in 10 minutes.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setFieldErrors({});

    const phoneCheck = isPhone(phone, { required: true });
    const otpCheck = isOtp(otp);
    const errors = {};
    if (!phoneCheck.ok) errors.phone = phoneCheck.message;
    if (!otpCheck.ok) errors.otp = otpCheck.message;
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const token = getAccessToken();
      const data = await apiFetch('/api/auth/whatsapp/verify-otp', {
        method: 'POST',
        token,
        body: { phone: phoneCheck.value, otp: otpCheck.value },
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
    <div className={styles.wrap}>
      <FormAlert type="error">{error}</FormAlert>
      <FormAlert type="success">{message}</FormAlert>

      {!sent ? (
        <form onSubmit={sendCode} noValidate className={styles.form}>
          <FormField
            id="wa-phone"
            label="WhatsApp number"
            required
            error={fieldErrors.phone}
            hint="Indian mobile with WhatsApp (+91). We’ll send a one-time code."
          >
            <input
              className="input"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </FormField>
          <button type="submit" className="btn btnPrimary" disabled={loading}>
            {loading ? 'Sending...' : 'Send WhatsApp code'}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} noValidate className={styles.form}>
          <p className={styles.sentTo}>
            Code sent to <strong>{phone}</strong>
            {' '}
            <button type="button" className={styles.linkBtn} onClick={() => { setSent(false); setOtp(''); setMessage(''); }}>
              Change number
            </button>
          </p>
          <FormField id="wa-otp" label="Verification code" required error={fieldErrors.otp}>
            <input
              className="input"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6-digit code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
          </FormField>
          <div className={styles.actions}>
            <button type="button" className="btn btnSecondary" disabled={loading} onClick={sendCode}>
              Resend code
            </button>
            <button type="submit" className="btn btnPrimary" disabled={loading}>
              {loading ? 'Verifying...' : submitLabel}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
