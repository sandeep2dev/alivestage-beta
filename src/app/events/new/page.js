'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import FormAlert from '@/components/FormAlert/FormAlert';
import FormField from '@/components/FormField/FormField';
import CityAutocomplete from '@/components/CityAutocomplete/CityAutocomplete';
import RichTextEditor from '@/components/RichTextEditor';
import DateTimePicker from '@/components/DateTimePicker/DateTimePicker';
import { apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { minDateTimeLocal } from '@/lib/datetime';
import { useAuth } from '@/contexts/AuthContext';
import { payAndConfirm } from '@/lib/payments';
import { focusFieldControl, validateFormAndFocus } from '@/lib/formFocus';
import styles from './new.module.css';

const VenueLocationPicker = dynamic(() => import('@/components/VenueLocationPicker'), {
  ssr: false,
  loading: () => <p className="formSectionHint">Loading map…</p>,
});

export default function NewEventPage() {
  const router = useRouter();
  const { openAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [venueError, setVenueError] = useState('');
  const [form, setForm] = useState({
    title: '',
    summary: '',
    description: '',
    city: '',
    venue: { address: '', lat: null, lng: null },
    startAt: '',
    durationMinutes: 120,
    maxSpots: 8,
  });

  async function submitCreate() {
    const token = getAccessToken();
    if (!token) return;

    const order = await apiFetch('/api/events/create-order', {
      method: 'POST',
      token,
      body: {
        title: form.title,
        summary: form.summary,
        description: form.description,
        city: form.city,
        precise_address: form.venue.address,
        venue_lat: form.venue.lat,
        venue_lng: form.venue.lng,
        start_at: new Date(form.startAt).toISOString(),
        duration_minutes: Number(form.durationMinutes),
        max_spots: Number(form.maxSpots),
      },
    });

    const result = await payAndConfirm({
      order,
      token,
      confirmPath: '/api/events/confirm-create',
    });

    router.push(`/events/${result.event.id}`);
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!validateFormAndFocus(e.currentTarget)) return;

    if (form.venue.lat == null || form.venue.lng == null) {
      setVenueError('Drop a pin on the map to confirm the exact venue location.');
      focusFieldControl('venue-location');
      return;
    }
    setVenueError('');

    setLoading(true);
    setError('');
    try {
      const token = getAccessToken();
      if (!token) {
        openAuth({
          onSuccess: async () => {
            setLoading(true);
            try {
              await submitCreate();
            } catch (err) {
              setError(err.message || 'Failed to create event');
            } finally {
              setLoading(false);
            }
          },
        });
        return;
      }
      await submitCreate();
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
        <section className="formSection">
          <h2 className="formSectionTitle">Basics</h2>
          <p className="formSectionHint">What shows on the public feed.</p>
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
              className="textarea"
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
          <FormField id="maxSpots" label="Spots available" required hint="How many people can join this jam">
            <input
              type="number"
              className="input"
              min={1}
              max={100}
              value={form.maxSpots}
              onChange={(e) => setForm((f) => ({ ...f, maxSpots: e.target.value }))}
              required
            />
          </FormField>
        </section>

        <section className="formSection">
          <h2 className="formSectionTitle">When</h2>
          <div className="formGrid2">
            <FormField id="start" label="Starts at" required hint="At least 1 hour from now">
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
          </div>
        </section>

        <section className="formSection">
          <h2 className="formSectionTitle">Location</h2>
          <p className="formSectionHint">City is public. Precise address unlocks for paid joiners.</p>
          <FormField id="city" label="City" required>
            <CityAutocomplete
              id="city"
              value={form.city}
              onChange={(city) => setForm((f) => ({ ...f, city }))}
              required
            />
          </FormField>
          <FormField
            id="venue-location"
            label="Precise address"
            required
            hint="Search, pick a result, or drop a pin — only visible to paid joiners and you"
          >
            <VenueLocationPicker
              value={form.venue}
              onChange={(venue) => {
                setVenueError('');
                setForm((f) => ({ ...f, venue }));
              }}
              error={venueError}
            />
          </FormField>
        </section>

        <div className={styles.submitRow}>
          <button type="submit" className="btn btnPrimary" disabled={loading}>
            {loading ? 'Processing…' : 'Pay ₹200 & publish'}
          </button>
        </div>
      </form>
    </div>
  );
}
