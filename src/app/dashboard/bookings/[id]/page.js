'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { formatCityLabel } from '@/lib/cities';
import { statusClass, statusLabel } from '@/lib/status';
import ConfirmationModal from '@/components/ConfirmationModal/ConfirmationModal';
import FormAlert from '@/components/FormAlert/FormAlert';
import styles from '../../dashboard.module.css';

export default function ArtistBookingDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirm, setConfirm] = useState(null);

  async function load() {
    const token = getAccessToken();
    if (!token) {
      router.push('/auth');
      return;
    }
    try {
      const data = await apiFetch(`/api/bookings/${id}`, { token });
      setBooking(data);
    } catch (err) {
      setError(err.message);
      setBooking(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id, router]);

  async function runConfirmedAction() {
    if (!confirm || !booking) return;
    const { type } = confirm;
    setConfirm(null);
    setActionLoading(true);
    setError('');
    setMessage('');
    try {
      const token = getAccessToken();
      if (type === 'confirm') {
        await apiFetch(`/api/bookings/${booking.id}/confirm`, { method: 'POST', token });
        setMessage('Confirmed. The fan will be asked to pay the Alivestage fee.');
      } else if (type === 'decline') {
        await apiFetch(`/api/bookings/${booking.id}/decline`, { method: 'POST', token });
        setMessage('Booking declined.');
      }
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <div className={styles.page}><p>Loading...</p></div>;
  if (!booking) {
    return (
      <div className={styles.page}>
        <FormAlert type="error">{error || 'Booking not found'}</FormAlert>
        <Link href="/dashboard/bookings" className="btn btnSecondary">Back to bookings</Link>
      </div>
    );
  }

  const venue = [
    formatCityLabel(booking.venue_city),
    booking.venue_location,
  ].filter(Boolean).join(' — ') || '—';

  const guest = booking.fan?.name || booking.guest_name || 'Guest';
  const canRespond = booking.status === 'requested' && booking.source !== 'artist_manual';

  return (
    <div className={styles.page}>
      <p className={styles.meta}>
        <Link href="/dashboard/bookings">← My bookings</Link>
      </p>
      <h1 className="pageTitle">Booking details</h1>
      <p className="pageSubtitle">
        <span className={`statusBadge ${statusClass(booking.status)}`}>
          {statusLabel(booking.status)}
        </span>
      </p>

      <FormAlert type="error">{error}</FormAlert>
      <FormAlert type="success">{message}</FormAlert>

      <div className={`card ${styles.bookingCard}`}>
        <dl className="dataCardDl">
          <dt>Guest / Fan</dt>
          <dd>
            {guest}
            {booking.fan?.phone ? ` · ${booking.fan.phone}` : ''}
            {booking.fan?.email ? ` · ${booking.fan.email}` : ''}
          </dd>
          <dt>Event date</dt>
          <dd>{new Date(booking.event_date).toLocaleString()}</dd>
          <dt>Duration</dt>
          <dd>{booking.duration_hours} hour(s)</dd>
          <dt>Venue</dt>
          <dd>{venue}</dd>
          <dt>Event details</dt>
          <dd>{booking.event_details}</dd>
          <dt>Artist fee (off-platform)</dt>
          <dd>₹{Number(booking.total_amount).toLocaleString()}</dd>
          <dt>Alivestage fee (10%)</dt>
          <dd>₹{Number(booking.token_amount).toLocaleString()}</dd>
          <dt>Source</dt>
          <dd>{booking.source === 'artist_manual' ? 'Offline' : 'Platform'}</dd>
          {booking.artist_response_deadline && booking.status === 'requested' && (
            <>
              <dt>Respond by</dt>
              <dd>{new Date(booking.artist_response_deadline).toLocaleString()}</dd>
            </>
          )}
        </dl>

        {canRespond && (
          <div className={styles.actions} style={{ marginTop: '1.25rem' }}>
            <button
              type="button"
              className="btn btnPrimary"
              disabled={actionLoading}
              onClick={() => setConfirm({
                type: 'confirm',
                title: 'Confirm booking?',
                message: 'The fan will pay the 10% Alivestage fee. You collect your full fee directly from them.',
                confirmLabel: 'Confirm',
              })}
            >
              Confirm
            </button>
            <button
              type="button"
              className="btn btnDanger"
              disabled={actionLoading}
              onClick={() => setConfirm({
                type: 'decline',
                title: 'Decline booking?',
                message: 'The fan will be notified. No payment has been taken.',
                confirmLabel: 'Decline',
              })}
            >
              Decline
            </button>
          </div>
        )}
      </div>

      <ConfirmationModal
        open={Boolean(confirm)}
        title={confirm?.title || ''}
        message={confirm?.message || ''}
        confirmLabel={confirm?.confirmLabel || 'Confirm'}
        onConfirm={runConfirmedAction}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
