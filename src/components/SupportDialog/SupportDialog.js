'use client';

import { useEffect, useId, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { lengthBetween } from '@/lib/validators';
import FormAlert from '@/components/FormAlert/FormAlert';
import FormField from '@/components/FormField/FormField';
import styles from './SupportDialog.module.css';

export default function SupportDialog({ open, onClose }) {
  const titleId = useId();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    setMessage('');
    setError('');
    setFieldError('');
    setSuccess('');
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setFieldError('');

    const check = lengthBetween(message, { min: 10, max: 2000, label: 'Message' });
    if (!check.ok) {
      setFieldError(check.message);
      return;
    }

    setLoading(true);
    try {
      const token = getAccessToken();
      await apiFetch('/api/support', {
        method: 'POST',
        token,
        body: { message: check.value },
      });
      setSuccess('Thanks — your message was sent to the Alivestage team.');
      setMessage('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className={styles.title}>Support</h2>
        <p className={styles.subtitle}>
          Tell us what you need help with. We will get back to you asap.
        </p>

        <FormAlert type="error">{error}</FormAlert>
        <FormAlert type="success">{success}</FormAlert>

        <form onSubmit={handleSubmit} noValidate>
          <FormField
            id="support-message"
            label="Your message"
            required
            error={fieldError}
            hint="10–2000 characters"
          >
            <textarea
              className="textarea"
              rows={5}
              maxLength={2000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue or question..."
            />
          </FormField>
          <div className={styles.actions}>
            <button type="button" className="btn btnSecondary" onClick={onClose} disabled={loading}>
              Close
            </button>
            <button type="submit" className="btn btnPrimary" disabled={loading}>
              {loading ? 'Sending...' : 'Send message'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
