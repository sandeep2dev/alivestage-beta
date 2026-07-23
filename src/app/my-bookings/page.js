'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch, openRazorpayCheckout } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { formatCityLabel } from '@/lib/cities';
import { statusClass, statusLabel } from '@/lib/status';
import ConfirmationModal from '@/components/ConfirmationModal/ConfirmationModal';
import FormAlert from '@/components/FormAlert/FormAlert';
import styles from '@/app/dashboard/dashboard.module.css';

export default function MyBookingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirm, setConfirm] = useState(null);

  async function loadData() {
    const token = getAccessToken();
    if (!token) {
      router.push('/auth');
      return;
    }

    try {
      const me = await apiFetch('/api/auth/me', { token });
      if (me.profile?.role === 'artist') {
        router.replace('/dashboard/bookings');
        return;
      }
      if (me.profile?.role !== 'fan') {
        router.replace('/');
        return;
      }
      setProfile(me.profile);
      const data = await apiFetch('/api/bookings/mine', { token });
      setBookings(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('booked') === '1') {
      setMessage('Request sent. We will notify you when the artist responds.');
      router.replace('/my-bookings', { scroll: false });
    }
  }, [router]);

  useEffect(() => {
    if (typeof window === 'undefined' || loading || !bookings.length) return;
    const params = new URLSearchParams(window.location.search);
    const payId = params.get('pay');
    if (!payId) return;
    router.replace('/my-bookings', { scroll: false });
    const b = bookings.find((x) => x.id === payId);
    if (b?.status === 'awaiting_token') {
      handlePayToken(b);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot deep link from WhatsApp
  }, [loading, bookings]);

  async function withToken(action) {
    const token = getAccessToken();
    if (!token) {
      router.push('/auth');
      return;
    }
    return action(token);
  }

  async function runConfirmedAction() {
    if (!confirm) return;
    const { type, id } = confirm;
    setConfirm(null);
    setActionLoading(id);
    setError('');
    setMessage('');
    try {
      if (type === 'complete') {
        await withToken((token) => apiFetch(`/api/bookings/${id}/complete`, { method: 'POST', token }));
        setMessage('Event marked complete.');
      }
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handlePayToken(booking) {
    setActionLoading(booking.id);
    setError('');
    setMessage('');
    try {
      const result = await withToken((token) =>
        apiFetch(`/api/bookings/${booking.id}/pay-token`, { method: 'POST', token })
      );

      if (result.mock) {
        await withToken((token) =>
          apiFetch('/api/bookings/verify-token', {
            method: 'POST',
            token,
            body: {
              bookingId: booking.id,
              razorpay_order_id: result.orderId,
              razorpay_payment_id: `mock_pay_${Date.now()}`,
              razorpay_signature: 'mock',
            },
          })
        );
        setMessage('Alivestage fee paid. Booking locked — pay the artist their fee directly.');
        await loadData();
        return;
      }

      await openRazorpayCheckout({
        key: result.key,
        orderId: result.orderId,
        amount: result.amount,
        name: profile.name,
        email: profile.email,
        onSuccess: async (response) => {
          await withToken((token) =>
            apiFetch('/api/bookings/verify-token', {
              method: 'POST',
              token,
              body: {
                bookingId: booking.id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
            })
          );
          setMessage('Alivestage fee paid. Booking locked — pay the artist their fee directly.');
          await loadData();
        },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) return <div className="container"><p>Loading...</p></div>;

  const busyId = actionLoading;

  return (
    <div className={`container ${styles.page}`}>
      <h1 className="pageTitle">My Bookings</h1>
      <p className="pageSubtitle">Track your event bookings</p>

      <FormAlert type="error">{error}</FormAlert>
      <FormAlert type="success">{message}</FormAlert>

      {bookings.length === 0 ? (
        <div className={styles.empty}>
          <p>No bookings yet.</p>
          <p style={{ marginTop: '0.75rem' }}>
            <Link href="/" className="btn btnPrimary">Discover artists</Link>
          </p>
        </div>
      ) : (
        <div className={styles.list}>
          {bookings.map((b) => {
            const busy = busyId === b.id;

            return (
              <div key={b.id} className={`card ${styles.bookingCard}`}>
                <div className={styles.bookingHeader}>
                  <div>
                    <h3>{b.artist?.name || 'Unknown'}</h3>
                    <p className={styles.meta}>{new Date(b.event_date).toLocaleString()}</p>
                  </div>
                  <span className={`statusBadge ${statusClass(b.status)}`}>
                    {statusLabel(b.status)}
                  </span>
                </div>
                <p className={styles.details}>{b.event_details}</p>
                <p className={styles.meta}>
                  Venue: {formatCityLabel(b.venue_city) || '—'}
                  {b.venue_location ? ` — ${b.venue_location}` : ''}
                </p>
                <p className={styles.meta}>
                  Artist fee: ₹{Number(b.total_amount).toLocaleString()} (off-platform)
                  {' · '}
                  Alivestage fee: ₹{Number(b.token_amount).toLocaleString()}
                </p>

                <div className={styles.actions}>
                  {b.status === 'awaiting_token' && (
                    <button
                      type="button"
                      className="btn btnPrimary"
                      disabled={busy}
                      aria-busy={busy || undefined}
                      onClick={() => handlePayToken(b)}
                    >
                      {busy ? 'Processing...' : `Pay Alivestage fee (₹${Number(b.token_amount).toLocaleString()})`}
                    </button>
                  )}
                  {b.status === 'confirmed' && (
                    <button
                      type="button"
                      className="btn btnPrimary"
                      disabled={busy}
                      onClick={() => setConfirm({
                        type: 'complete',
                        id: b.id,
                        title: 'Mark event complete?',
                        message: 'Confirm only after the performance has finished.',
                        confirmLabel: 'Mark complete',
                      })}
                    >
                      {busy ? 'Working...' : 'Mark Event Complete'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
