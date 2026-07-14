'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { formatCityLabel } from '@/lib/cities';
import CitySelect from '@/components/CitySelect/CitySelect';
import styles from './artist.module.css';

export default function ArtistProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const [artist, setArtist] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBookForm, setShowBookForm] = useState(false);
  const [booking, setBooking] = useState({
    eventDetails: '',
    venueCityId: '',
    venueLocation: '',
    eventDate: '',
    durationHours: 2,
  });
  const [error, setError] = useState('');
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

  async function handleBook(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const token = getAccessToken();
      if (!token) {
        router.push('/auth');
        return;
      }
      if (profile?.role !== 'fan') {
        setError('Only fans can submit booking requests.');
        return;
      }

      const result = await apiFetch('/api/bookings/create', {
        method: 'POST',
        token,
        body: {
          artistId: id,
          eventDetails: booking.eventDetails,
          venueCityId: booking.venueCityId,
          venueLocation: booking.venueLocation,
          eventDate: booking.eventDate,
          durationHours: Number(booking.durationHours),
        },
      });

      if (result.mock) {
        await apiFetch('/api/bookings/verify-token', {
          method: 'POST',
          token,
          body: {
            bookingId: result.bookingId,
            razorpay_order_id: result.orderId,
            razorpay_payment_id: `mock_pay_${Date.now()}`,
            razorpay_signature: 'mock',
          },
        });
        router.push('/dashboard');
        return;
      }

      const { openRazorpayCheckout } = await import('@/lib/api');
      await openRazorpayCheckout({
        key: result.key,
        orderId: result.orderId,
        amount: result.amount,
        name: profile.name,
        email: profile.email,
        onSuccess: async (response) => {
          await apiFetch('/api/bookings/verify-token', {
            method: 'POST',
            token,
            body: {
              bookingId: result.bookingId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            },
          });
          router.push('/dashboard');
        },
      });
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
        ) : !showBookForm ? (
          <button type="button" className="btn btnPrimary" onClick={() => setShowBookForm(true)}>
            Start Booking
          </button>
        ) : (
          <form onSubmit={handleBook}>
            {error && <div className="alert alertError">{error}</div>}
            <div className="formGroup">
              <label className="label">Event details</label>
              <textarea className="textarea" rows={3} value={booking.eventDetails} onChange={(e) => setBooking({ ...booking, eventDetails: e.target.value })} required />
            </div>
            <div className="formGroup">
              <label className="label">Venue city</label>
              <CitySelect
                id="venueCity"
                value={booking.venueCityId}
                onChange={(venueCityId) => setBooking({ ...booking, venueCityId })}
                required
                placeholder="Select venue city"
              />
            </div>
            <div className="formGroup">
              <label className="label">Venue address</label>
              <input
                className="input"
                value={booking.venueLocation}
                onChange={(e) => setBooking({ ...booking, venueLocation: e.target.value })}
                required
                placeholder="Full venue address"
              />
            </div>
            <div className="formGroup">
              <label className="label">Event date & time</label>
              <input type="datetime-local" className="input" value={booking.eventDate} onChange={(e) => setBooking({ ...booking, eventDate: e.target.value })} required />
            </div>
            <div className="formGroup">
              <label className="label">Duration (hours)</label>
              <input type="number" className="input" min="1" value={booking.durationHours} onChange={(e) => setBooking({ ...booking, durationHours: e.target.value })} required />
            </div>
            <p className={styles.tokenNote}>A 20% token payment is required upfront. The balance is due after the artist accepts.</p>
            <button type="submit" className="btn btnPrimary" disabled={submitting}>
              {submitting ? 'Processing...' : 'Pay Token & Submit'}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
