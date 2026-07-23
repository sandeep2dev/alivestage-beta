'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { formatCityLabel } from '@/lib/cities';
import {
  isFutureDateTime,
  lengthBetween,
  minDateTimeLocal,
  parseMoney,
} from '@/lib/validators';
import CitySelect from '@/components/CitySelect/CitySelect';
import FormAlert from '@/components/FormAlert/FormAlert';
import FormField from '@/components/FormField/FormField';
import WhatsAppVerify from '@/components/WhatsAppVerify/WhatsAppVerify';
import styles from './artist.module.css';

const TOKEN_RATIO = 0.1;

function hasVerifiedWhatsApp(p) {
  return Boolean(p?.phone && p?.whatsapp_verified_at);
}

export default function ArtistProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const [artist, setArtist] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBookForm, setShowBookForm] = useState(false);
  const [needsWhatsApp, setNeedsWhatsApp] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);
  const [booking, setBooking] = useState({
    eventDetails: '',
    venueCityId: '',
    venueLocation: '',
    eventDate: '',
    durationHours: 2,
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch(`/api/artists/${id}`);
        setArtist(data);
      } catch {
        setArtist(null);
      } finally {
        setLoading(false);
      }
    }
    async function loadProfile() {
      const token = getAccessToken();
      if (!token) return;
      try {
        const data = await apiFetch('/api/auth/me', { token });
        setProfile(data.profile);
      } catch {
        setProfile(null);
      }
    }
    load();
    loadProfile();
  }, [id]);

  function getYoutubeId(url) {
    const match = url.match(/(?:youtu\.be\/|v=)([^&]+)/);
    return match ? match[1] : null;
  }

  const costPreview = useMemo(() => {
    if (!artist) return null;
    const hours = Number(booking.durationHours);
    if (!Number.isFinite(hours) || hours < 1) return null;
    const hourlyTotal = Number(artist.hourly_rate) * hours;
    const total = Math.max(Number(artist.min_booking_amount), hourlyTotal);
    const fee = Math.round(total * TOKEN_RATIO * 100) / 100;
    return { total, fee };
  }, [artist, booking.durationHours]);

  async function submitBooking(payload) {
    const token = getAccessToken();
    await apiFetch('/api/bookings/create', {
      method: 'POST',
      token,
      body: payload,
    });
    router.push('/my-bookings?booked=1');
  }

  async function handleBook(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setFieldErrors({});

    const token = getAccessToken();
    if (!token) {
      router.push('/auth');
      setSubmitting(false);
      return;
    }
    if (profile?.role !== 'fan') {
      setError('Only fans can submit booking requests.');
      setSubmitting(false);
      return;
    }

    const details = lengthBetween(booking.eventDetails, { min: 10, max: 2000, label: 'Event details' });
    const address = lengthBetween(booking.venueLocation, { min: 5, max: 500, label: 'Venue address' });
    const when = isFutureDateTime(booking.eventDate, { minHoursAhead: 1 });
    const duration = parseMoney(booking.durationHours, {
      label: 'Duration',
      min: 1,
      max: 12,
      integer: true,
    });

    const errors = {};
    if (!details.ok) errors.eventDetails = details.message;
    if (!booking.venueCityId) errors.venueCityId = 'Select a venue city';
    if (!address.ok) errors.venueLocation = address.message;
    if (!when.ok) errors.eventDate = when.message;
    if (!duration.ok) errors.durationHours = duration.message;

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setSubmitting(false);
      return;
    }

    const payload = {
      artistId: id,
      eventDetails: details.value,
      venueCityId: booking.venueCityId,
      venueLocation: address.value,
      eventDate: when.value,
      durationHours: duration.value,
    };

    if (!hasVerifiedWhatsApp(profile)) {
      setPendingPayload(payload);
      setNeedsWhatsApp(true);
      setSubmitting(false);
      return;
    }

    try {
      await submitBooking(payload);
    } catch (err) {
      if (String(err.message || '').toLowerCase().includes('whatsapp')) {
        setPendingPayload(payload);
        setNeedsWhatsApp(true);
      } else {
        setError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function onWhatsAppVerified(updatedProfile) {
    setProfile(updatedProfile);
    setNeedsWhatsApp(false);
    if (!pendingPayload) return;
    setSubmitting(true);
    setError('');
    try {
      await submitBooking(pendingPayload);
      setPendingPayload(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="container"><p>Loading...</p></div>;
  if (!artist) return <div className="container"><p>Artist not found.</p></div>;

  const p = artist.profile || {};
  const links = artist.youtube_links || [];

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.header}>
        {p.avatar_url ? (
          <img src={p.avatar_url} alt={p.name} className={styles.avatar} />
        ) : (
          <div className={styles.avatarPlaceholder}>{p.name?.[0]}</div>
        )}
        <div>
          <h1 className="pageTitle">{p.name}</h1>
          <p className={styles.city}>{formatCityLabel(artist.city) || '—'}</p>
          <div className={styles.rates}>
            <span>₹{Number(artist.hourly_rate).toLocaleString()}/hr</span>
            <span>Min booking ₹{Number(artist.min_booking_amount).toLocaleString()}</span>
          </div>
          {(artist.genres || []).length > 0 && (
            <div className={styles.genres}>
              {artist.genres.map((g) => <span key={g} className={styles.genreTag}>{g}</span>)}
            </div>
          )}
        </div>
      </div>

      {artist.bio && (
        <section className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 className={styles.sectionTitle}>About</h2>
          <p>{artist.bio}</p>
        </section>
      )}

      {links.length > 0 && (
        <section className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 className={styles.sectionTitle}>Performances</h2>
          <div className={styles.videos}>
            {links.map((url) => {
              const vid = getYoutubeId(url);
              return vid ? (
                <iframe
                  key={url}
                  src={`https://www.youtube.com/embed/${vid}`}
                  title="Performance"
                  className={styles.video}
                  allowFullScreen
                />
              ) : null;
            })}
          </div>
        </section>
      )}

      <section className="card">
        <h2 className={styles.sectionTitle}>Book This Artist</h2>
        {!profile ? (
          <p>Please <Link href="/auth">sign in</Link> as a fan to book.</p>
        ) : profile.role !== 'fan' ? (
          <p>Only fans can submit booking requests.</p>
        ) : needsWhatsApp ? (
          <div>
            <p className={styles.tokenNote}>
              Verify your WhatsApp number so the artist can reach you. This is required before we send the request.
            </p>
            <FormAlert type="error">{error}</FormAlert>
            <WhatsAppVerify
              initialPhone={profile.phone || ''}
              onVerified={onWhatsAppVerified}
              submitLabel="Verify & send request"
            />
            <div className={styles.bookActions} style={{ marginTop: '1rem' }}>
              <button
                type="button"
                className="btn btnSecondary"
                disabled={submitting}
                onClick={() => { setNeedsWhatsApp(false); setPendingPayload(null); }}
              >
                Back to form
              </button>
            </div>
          </div>
        ) : !showBookForm ? (
          <button type="button" className="btn btnPrimary" onClick={() => setShowBookForm(true)}>
            Start Booking
          </button>
        ) : (
          <form onSubmit={handleBook} noValidate>
            <FormAlert type="error">{error}</FormAlert>
            <FormField id="eventDetails" label="Event details" required error={fieldErrors.eventDetails} hint="At least 10 characters">
              <textarea
                className="textarea"
                rows={3}
                value={booking.eventDetails}
                onChange={(e) => setBooking({ ...booking, eventDetails: e.target.value })}
              />
            </FormField>
            <FormField id="venueCity" label="Venue city" required error={fieldErrors.venueCityId}>
              <CitySelect
                id="venueCity"
                value={booking.venueCityId}
                onChange={(venueCityId) => {
                  setBooking({ ...booking, venueCityId });
                  setFieldErrors((prev) => ({ ...prev, venueCityId: '' }));
                }}
                required
                placeholder="Select venue city"
              />
            </FormField>
            <FormField id="venueLocation" label="Venue address" required error={fieldErrors.venueLocation}>
              <input
                className="input"
                value={booking.venueLocation}
                onChange={(e) => setBooking({ ...booking, venueLocation: e.target.value })}
                autoComplete="street-address"
                placeholder="Full venue address"
              />
            </FormField>
            <FormField id="eventDate" label="Event date & time" required error={fieldErrors.eventDate} hint="At least 1 hour from now">
              <input
                type="datetime-local"
                className="input"
                min={minDateTimeLocal(1)}
                value={booking.eventDate}
                onChange={(e) => setBooking({ ...booking, eventDate: e.target.value })}
              />
            </FormField>
            <FormField id="durationHours" label="Duration (hours)" required error={fieldErrors.durationHours} hint="1–12 hours">
              <input
                type="number"
                className="input"
                min={1}
                max={12}
                step={1}
                value={booking.durationHours}
                onChange={(e) => setBooking({ ...booking, durationHours: e.target.value })}
              />
            </FormField>

            {costPreview && (
              <div className={styles.costPreview}>
                <p><strong>Artist fee:</strong> ₹{costPreview.total.toLocaleString()} (pay the artist directly after booking is locked)</p>
                <p><strong>Alivestage fee (10%):</strong> ₹{costPreview.fee.toLocaleString()} — due after the artist confirms</p>
              </div>
            )}

            <p className={styles.tokenNote}>
              No payment now. We will notify the artist on WhatsApp. If they confirm, you pay the 10% Alivestage fee to lock the booking, then settle the artist fee off-platform.
            </p>
            <div className={styles.bookActions}>
              <button type="button" className="btn btnSecondary" disabled={submitting} onClick={() => setShowBookForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btnPrimary" disabled={submitting}>
                {submitting ? 'Sending...' : 'Send booking request'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
