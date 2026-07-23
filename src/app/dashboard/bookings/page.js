'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
      if (type === 'confirm') {
        await withToken((token) => apiFetch(`/api/bookings/${id}/confirm`, { method: 'POST', token }));
        setMessage('Confirmed. The fan will be asked to pay the Alivestage fee.');
      } else if (type === 'decline') {
        await withToken((token) => apiFetch(`/api/bookings/${id}/decline`, { method: 'POST', token }));
        setMessage('Booking declined.');
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

  function venueLabel(b) {
    return [
      formatCityLabel(b.venue_city),
      b.venue_location,
    ].filter(Boolean).join(' — ') || '—';
  }

  function renderActions(b, busy) {
    if (b.status === 'requested' && b.source !== 'artist_manual') {
      return (
        <div className={styles.tableActions}>
          <Link href={`/dashboard/bookings/${b.id}`} className="btn btnSecondary">
            Details
          </Link>
          <button
            type="button"
            className="btn btnPrimary"
            disabled={busy}
            aria-busy={busy || undefined}
            onClick={() => setConfirm({
              type: 'confirm',
              id: b.id,
              title: 'Confirm booking?',
              message: 'The fan will pay the 10% Alivestage fee to lock the booking. You collect your full fee directly from them.',
              confirmLabel: 'Confirm',
            })}
          >
            {busy ? '...' : 'Confirm'}
          </button>
          <button
            type="button"
            className="btn btnDanger"
            disabled={busy}
            onClick={() => setConfirm({
              type: 'decline',
              id: b.id,
              title: 'Decline booking?',
              message: 'The fan will be notified. No payment has been taken.',
              confirmLabel: 'Decline',
            })}
          >
            {busy ? '...' : 'Decline'}
          </button>
        </div>
      );
    }
    return (
      <Link href={`/dashboard/bookings/${b.id}`} className="btn btnSecondary">
        Details
      </Link>
    );
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
        <>
          <div className={`desktopOnly ${styles.tableWrap}`}>
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
                  return (
                    <tr key={b.id}>
                      <td>{counterpartyName(b)}</td>
                      <td className={styles.cellClamp}>{b.event_details}</td>
                      <td className={styles.cellClamp}>{venueLabel(b)}</td>
                      <td>{new Date(b.event_date).toLocaleString()}</td>
                      <td>₹{Number(b.total_amount).toLocaleString()}</td>
                      <td>{b.source === 'artist_manual' ? 'Offline' : 'Platform'}</td>
                      <td>
                        <span className={`statusBadge ${statusClass(b.status)}`}>
                          {statusLabel(b.status)}
                        </span>
                      </td>
                      <td>{renderActions(b, busy)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mobileOnly dataCardList">
            {bookings.map((b) => {
              const busy = busyId === b.id;
              const hasActions = b.status === 'requested' && b.source !== 'artist_manual';
              return (
                <article key={b.id} className="dataCard">
                  <div className="dataCardTop">
                    <div>
                      <h3 className="dataCardTitle">{counterpartyName(b)}</h3>
                      <p className="dataCardMeta">
                        {new Date(b.event_date).toLocaleString()} · ₹{Number(b.total_amount).toLocaleString()}
                      </p>
                    </div>
                    <span className={`statusBadge ${statusClass(b.status)}`}>
                      {statusLabel(b.status)}
                    </span>
                  </div>

                  <div className="dataCardActions">
                    {hasActions ? renderActions(b, busy) : (
                      <Link href={`/dashboard/bookings/${b.id}`} className="btn btnSecondary">
                        Details
                      </Link>
                    )}
                  </div>

                  <details className="dataCardDetails">
                    <summary>Details</summary>
                    <dl className="dataCardDl">
                      <dt>Event</dt>
                      <dd>{b.event_details || '—'}</dd>
                      <dt>Venue</dt>
                      <dd>{venueLabel(b)}</dd>
                      <dt>Source</dt>
                      <dd>{b.source === 'artist_manual' ? 'Offline' : 'Platform'}</dd>
                    </dl>
                  </details>
                </article>
              );
            })}
          </div>
        </>
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
