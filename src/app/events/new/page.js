'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import FormAlert from '@/components/FormAlert/FormAlert';
import FormField from '@/components/FormField/FormField';
import { apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { payAndConfirm } from '@/lib/payments';
import styles from './new.module.css';

export default function NewEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    summary: '',
    description: '',
    city: '',
    preciseAddress: '',
    startAt: '',
    durationMinutes: 120,
  });

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const token = getAccessToken();
      if (!token) {
        router.push('/auth');
        return;
      }

      const order = await apiFetch('/api/events/create-order', {
        method: 'POST',
        token,
        body: {
          title: form.title,
          summary: form.summary,
          description: form.description,
          city: form.city,
          precise_address: form.preciseAddress,
          start_at: new Date(form.startAt).toISOString(),
          duration_minutes: Number(form.durationMinutes),
        },
      });

      const result = await payAndConfirm({
        order,
        token,
        confirmPath: '/api/events/confirm-create',
      });

      router.push(`/events/${result.event.id}`);
    } catch (err) {
      setError(err.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`container ${styles.page}`}>
      <h1 className="pageTitle">Host a jam</h1>
      <p className="pageSubtitle">₹200 create fee. Joiners pay ₹50 to unlock the precise address.</p>

      <FormAlert type="error">{error}</FormAlert>

      <form className={`card ${styles.form}`} onSubmit={onSubmit} noValidate>
        <FormField id="title" label="Title" required>
          <input
            className="input"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
          />
        </FormField>
        <FormField id="summary" label="Summary" required hint="Shown on the public feed">
          <textarea
            className="input"
            rows={2}
            value={form.summary}
            onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
            required
          />
        </FormField>
        <FormField id="description" label="Description">
          <textarea
            className="input"
            rows={5}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
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
        <FormField
          id="address"
          label="Precise address"
          required
          hint="Only visible to paid joiners and you"
        >
          <textarea
            className="input"
            rows={2}
            value={form.preciseAddress}
            onChange={(e) => setForm((f) => ({ ...f, preciseAddress: e.target.value }))}
            required
          />
        </FormField>
        <FormField id="start" label="Starts at" required>
          <input
            type="datetime-local"
            className="input"
            value={form.startAt}
            onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))}
            required
          />
        </FormField>
        <FormField id="duration" label="Duration (minutes)" required>
          <input
            type="number"
            className="input"
            min={30}
            max={1440}
            value={form.durationMinutes}
            onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))}
            required
          />
        </FormField>
        <button type="submit" className="btn btnPrimary" disabled={loading}>
          {loading ? 'Processing…' : 'Pay ₹200 & publish'}
        </button>
      </form>
    </div>
  );
}
