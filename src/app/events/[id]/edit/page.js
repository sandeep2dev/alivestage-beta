'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import FormAlert from '@/components/FormAlert/FormAlert';
import FormField from '@/components/FormField/FormField';
import CityAutocomplete from '@/components/CityAutocomplete/CityAutocomplete';
import RichTextEditor from '@/components/RichTextEditor';
import { apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import DateTimePicker from '@/components/DateTimePicker/DateTimePicker';
import { isoToLocalDateTimeValue, minDateTimeLocal } from '@/lib/datetime';
import { validateFormAndFocus } from '@/lib/formFocus';
import styles from '../../new/new.module.css';

export default function EditEventPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
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

  useEffect(() => {
    async function load() {
      const token = getAccessToken();
      if (!token) {
        router.replace('/auth');
        return;
      }
      try {
        const data = await apiFetch(`/api/events/${id}`, { token });
        const event = data.event;
        if (!event?.is_host) {
          router.replace(`/events/${id}`);
          return;
        }
        if (event.status !== 'created') {
          setError('Only events in created status can be edited.');
        }
        setForm({
          title: event.title || '',
          summary: event.summary || '',
          description: event.description || '',
          city: event.city || '',
          preciseAddress: event.precise_address || '',
          startAt: isoToLocalDateTimeValue(event.start_at),
          durationMinutes: event.duration_minutes || 120,
        });
        setReady(true);
      } catch (err) {
        setError(err.message || 'Failed to load event');
        setReady(true);
      }
    }
    load();
  }, [id, router]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!validateFormAndFocus(e.currentTarget)) return;

    setLoading(true);
    setError('');
    try {
      const token = getAccessToken();
      await apiFetch(`/api/events/${id}`, {
        method: 'PATCH',
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
      router.push(`/events/${id}`);
    } catch (err) {
      setError(err.message || 'Failed to update event');
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <div className={`container ${styles.page}`}>
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className={`container ${styles.page}`}>
      <h1 className="pageTitle">Edit jam</h1>
      <p className="pageSubtitle">You can edit until someone joins or you mark the jam live.</p>

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
        <FormField id="summary" label="Summary" required>
          <textarea
            className="input"
            rows={2}
            value={form.summary}
            onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
            required
          />
        </FormField>
        <FormField id="description" label="Description" hint="Formatting, links, and photos appear the same for joiners.">
          <RichTextEditor
            value={form.description}
            onChange={(description) => setForm((f) => ({ ...f, description }))}
          />
        </FormField>
        <FormField id="city" label="City" required>
          <CityAutocomplete
            id="city"
            value={form.city}
            onChange={(city) => setForm((f) => ({ ...f, city }))}
            required
          />
        </FormField>
        <FormField id="address" label="Precise address" required>
          <textarea
            className="input"
            rows={2}
            value={form.preciseAddress}
            onChange={(e) => setForm((f) => ({ ...f, preciseAddress: e.target.value }))}
            required
          />
        </FormField>
        <FormField id="start" label="Starts at" required hint="Must be in the future">
          <DateTimePicker
            value={form.startAt}
            onChange={(startAt) => setForm((f) => ({ ...f, startAt }))}
            min={minDateTimeLocal(1)}
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
          {loading ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
