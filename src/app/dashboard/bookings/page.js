'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { formatCityLabel } from '@/lib/cities';
import { statusClass, statusLabel } from '@/lib/status';
import ConfirmationModal from '@/components/ConfirmationModal/ConfirmationModal';
import FormAlert from '@/components/FormAlert/FormAlert';
import styles from '../dashboard.module.css';

export default function ArtistBookingsPage() {
  const router = useRouter();
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

  async function runConfirmedAction() {
    if (!confirm) return;
    const { type, id } = confirm;
    setConfirm(null);
    setActionLoading(id);
    setError('');
    setMessage('');
    try {
      if (type === 'accept') {
        await withToken((token) => apiFetch(`/api/bookings/${id}/accept`, { method: 'POST', token }));
        setMessage('Booking accepted.');
      } else if (type === 'reject') {
        await withToken((token) => apiFetch(`/api/bookings/${id}/reject`, { method: 'POST', token }));
        setMessage('Booking rejected.');
      }
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  function counterpartyName(b) {
    return b.fan?.name || b.guest_name || 'Guest';
  }

  if (loading) return <div className={styles.page}><p>Loading...</p></div>;

  const busyId = actionLoading;

  return (
    <div className={styles.page}>
      <h1 className="pageTitle">My bookings</h1>
      <p className="pageSubtitle">Manage incoming and offline bookings</p>

      <FormAlert type="error">{error}</FormAlert>
      <FormAlert type="success">{message}</FormAlert>

      {bookings.length === 0 ? (
        <div className={styles.empty}>
          <p>No bookings yet.</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className="table">
            <thead>
              <tr>
                <th>Guest / Fan</th>
                <th>Event</th>
                <th>Venue</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Source</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const busy = busyId === b.id;
                const venue = [
                  formatCityLabel(b.venue_city),
                  b.venue_location,
                ].filter(Boolean).join(' — ') || '—';

                return (
                  <tr key={b.id}>
                    <td>{counterpartyName(b)}</td>
                    <td className={styles.cellClamp}>{b.event_details}</td>
                    <td className={styles.cellClamp}>{venue}</td>
                    <td>{new Date(b.event_date).toLocaleString()}</td>
                    <td>₹{Number(b.total_amount).toLocaleString()}</td>
                    <td>{b.source === 'artist_manual' ? 'Offline' : 'Platform'}</td>
                    <td>
                      <span className={`statusBadge ${statusClass(b.status)}`}>
                        {statusLabel(b.status)}
                      </span>
                    </td>
                    <td>
                      {b.status === 'pending' && b.source !== 'artist_manual' ? (
                        <div className={styles.tableActions}>
                          <button
                            type="button"
                            className="btn btnPrimary"
                            disabled={busy}
                            aria-busy={busy || undefined}
                            onClick={() => setConfirm({
                              type: 'accept',
                              id: b.id,
                              title: 'Accept booking?',
                              message: 'The fan will be asked to pay the remaining balance.',
                              confirmLabel: 'Accept',
                            })}
                          >
                            {busy ? '...' : 'Accept'}
                          </button>
                          <button
                            type="button"
                            className="btn btnDanger"
                            disabled={busy}
                            onClick={() => setConfirm({
                              type: 'reject',
                              id: b.id,
                              title: 'Reject booking?',
                              message: 'The fan’s token payment will be refunded.',
                              confirmLabel: 'Reject',
                            })}
                          >
                            {busy ? '...' : 'Reject'}
                          </button>
                        </div>
                      ) : (
                        <span className={styles.meta}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
