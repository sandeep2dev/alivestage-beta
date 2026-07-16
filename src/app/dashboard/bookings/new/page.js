'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import {
  isFutureDateTime,
  lengthBetween,
  minDateTimeLocal,
  parseMoney,
} from '@/lib/validators';
import CitySelect from '@/components/CitySelect/CitySelect';
import FormAlert from '@/components/FormAlert/FormAlert';
import FormField from '@/components/FormField/FormField';
import styles from '../../dashboard.module.css';

export default function AddBookingPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    guestName: '',
    eventDetails: '',
    venueCityId: '',
    venueLocation: '',
    eventDate: '',
    durationHours: '2',
    totalAmount: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setFieldErrors({});

    const name = lengthBetween(form.guestName, { min: 2, max: 80, label: 'Guest name' });
    const details = lengthBetween(form.eventDetails, { min: 10, max: 2000, label: 'Event details' });
    const address = lengthBetween(form.venueLocation, { min: 5, max: 500, label: 'Venue address' });
    const amount = parseMoney(form.totalAmount, { label: 'Total amount', min: 1 });
    const hours = Number(form.durationHours);
    const errors = {};

    if (!name.ok) errors.guestName = name.message;
    if (!details.ok) errors.eventDetails = details.message;
    if (!form.venueCityId) errors.venueCityId = 'Select a city';
    if (!address.ok) errors.venueLocation = address.message;
    if (!form.eventDate) {
      errors.eventDate = 'Pick a date and time';
    } else if (!isFutureDateTime(form.eventDate)) {
      errors.eventDate = 'Event must be in the future';
    }
    if (!Number.isFinite(hours) || hours < 1 || hours > 24) {
      errors.durationHours = 'Duration must be 1–24 hours';
    }
    if (!amount.ok) errors.totalAmount = amount.message;

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setSubmitting(false);
      return;
    }

    try {
      const token = getAccessToken();
      if (!token) {
        router.push('/auth');
        return;
      }
      await apiFetch('/api/bookings/manual', {
        method: 'POST',
        token,
        body: {
          guestName: form.guestName.trim(),
          eventDetails: form.eventDetails.trim(),
          venueCityId: form.venueCityId,
          venueLocation: form.venueLocation.trim(),
          eventDate: new Date(form.eventDate).toISOString(),
          durationHours: hours,
          totalAmount: amount.value,
        },
      });
      router.push('/dashboard/bookings');
      router.refresh();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <h1 className="pageTitle">Add new booking</h1>
      <p className="pageSubtitle">Record an offline booking (no platform payment)</p>

      <FormAlert type="error">{error}</FormAlert>

      <form className={`card ${styles.settingsForm}`} onSubmit={handleSubmit}>
        <FormField label="Guest name" error={fieldErrors.guestName} id="guestName">
          <input
            className="input"
            value={form.guestName}
            onChange={(e) => setForm({ ...form, guestName: e.target.value })}
          />
        </FormField>

        <FormField label="Event details" error={fieldErrors.eventDetails} id="details">
          <textarea
            className="input"
            rows={4}
            value={form.eventDetails}
            onChange={(e) => setForm({ ...form, eventDetails: e.target.value })}
          />
        </FormField>

        <FormField label="Venue city" error={fieldErrors.venueCityId} id="city">
          <CitySelect
            value={form.venueCityId}
            onChange={(venueCityId) => setForm({ ...form, venueCityId })}
          />
        </FormField>

        <FormField label="Venue address" error={fieldErrors.venueLocation} id="address">
          <input
            className="input"
            value={form.venueLocation}
            onChange={(e) => setForm({ ...form, venueLocation: e.target.value })}
          />
        </FormField>

        <FormField label="Event date & time" error={fieldErrors.eventDate} id="date">
          <input
            type="datetime-local"
            className="input"
            min={minDateTimeLocal()}
            value={form.eventDate}
            onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
          />
        </FormField>

        <div className={styles.rateRow}>
          <FormField label="Duration (hours)" error={fieldErrors.durationHours} id="hours">
            <input
              type="number"
              min={1}
              max={24}
              className="input"
              value={form.durationHours}
              onChange={(e) => setForm({ ...form, durationHours: e.target.value })}
            />
          </FormField>
          <FormField label="Total amount (₹)" error={fieldErrors.totalAmount} id="amount">
            <input
              className="input"
              value={form.totalAmount}
              onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
            />
          </FormField>
        </div>

        <button type="submit" className="btn btnPrimary" disabled={submitting}>
          {submitting ? 'Saving...' : 'Create booking'}
        </button>
      </form>
    </div>
  );
}
