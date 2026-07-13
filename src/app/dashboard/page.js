'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, openRazorpayCheckout } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { statusClass, statusLabel } from '@/lib/status';
import styles from './dashboard.module.css';

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');

  async function loadData() {
    const token = getAccessToken();
    if (!token) {
      router.push('/auth');
      return;
    }

    try {
      const me = await apiFetch('/api/auth/me', { token });
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

  async function withToken(action) {
    const token = getAccessToken();
    if (!token) {
      router.push('/auth');
      return;
    }
    return action(token);
  }

  async function handleAccept(id) {
    setActionLoading(id);
    try {
      await withToken((token) => apiFetch(`/api/bookings/${id}/accept`, { method: 'POST', token }));
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(id) {
    setActionLoading(id);
    try {
      await withToken((token) => apiFetch(`/api/bookings/${id}/reject`, { method: 'POST', token }));
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handlePayBalance(booking) {
    setActionLoading(booking.id);
    try {
      const result = await withToken((token) =>
        apiFetch(`/api/bookings/${booking.id}/pay-balance`, { method: 'POST', token })
      );

      if (result.mock) {
        await withToken((token) =>
          apiFetch('/api/bookings/verify-balance', {
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
            apiFetch('/api/bookings/verify-balance', {
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
          await loadData();
        },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleComplete(id) {
    setActionLoading(id);
    try {
      await withToken((token) => apiFetch(`/api/bookings/${id}/complete`, { method: 'POST', token }));
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) return <div className="container"><p>Loading...</p></div>;

  const isArtist = profile?.role === 'artist';
  const isFan = profile?.role === 'fan';

  return (
    <div className={`container ${styles.page}`}>
      <h1 className="pageTitle">{isArtist ? 'Artist Dashboard' : 'My Bookings'}</h1>
      <p className="pageSubtitle">
        {isArtist ? 'Manage incoming booking requests' : 'Track your event bookings'}
      </p>

      {error && <div className="alert alertError">{error}</div>}

      {bookings.length === 0 ? (
        <p className={styles.empty}>No bookings yet.</p>
      ) : (
        <div className={styles.list}>
          {bookings.map((b) => {
            const counterparty = isArtist ? b.fan : b.artist;
            const hasBalancePaid = (b.payments || []).some(
              (p) => p.payment_type === 'balance' && p.status === 'fully_paid'
            );

            return (
              <div key={b.id} className={`card ${styles.bookingCard}`}>
                <div className={styles.bookingHeader}>
                  <div>
                    <h3>{counterparty?.name || 'Unknown'}</h3>
                    <p className={styles.meta}>{new Date(b.event_date).toLocaleString()}</p>
                  </div>
                  <span className={`statusBadge ${statusClass(b.status)}`}>
                    {statusLabel(b.status)}
                  </span>
                </div>
                <p className={styles.details}>{b.event_details}</p>
                <p className={styles.meta}>Venue: {b.venue_location}</p>
                <p className={styles.meta}>
                  Total: ₹{Number(b.total_amount).toLocaleString()} · Token: ₹{Number(b.token_amount).toLocaleString()} · Balance: ₹{Number(b.remaining_amount).toLocaleString()}
                </p>

                <div className={styles.actions}>
                  {isArtist && b.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        className="btn btnPrimary"
                        disabled={actionLoading === b.id}
                        onClick={() => handleAccept(b.id)}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className="btn btnDanger"
                        disabled={actionLoading === b.id}
                        onClick={() => handleReject(b.id)}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {isFan && b.status === 'confirmed' && !hasBalancePaid && (
                    <button
                      type="button"
                      className="btn btnPrimary"
                      disabled={actionLoading === b.id}
                      onClick={() => handlePayBalance(b)}
                    >
                      Pay Balance (₹{Number(b.remaining_amount).toLocaleString()})
                    </button>
                  )}
                  {isFan && b.status === 'confirmed' && hasBalancePaid && (
                    <button
                      type="button"
                      className="btn btnPrimary"
                      disabled={actionLoading === b.id}
                      onClick={() => handleComplete(b.id)}
                    >
                      Mark Event Complete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
