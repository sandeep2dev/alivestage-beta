'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { statusClass, statusLabel } from '@/lib/status';
import ConfirmationModal from '@/components/ConfirmationModal/ConfirmationModal';
import FormAlert from '@/components/FormAlert/FormAlert';
import styles from './bookings.module.css';

export default function AdminBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirm, setConfirm] = useState(null);

  async function load() {
    const token = getAccessToken();
    if (!token) {
      router.replace('/auth');
      return;
    }

    try {
      const me = await apiFetch('/api/auth/me', { token });
      setProfile(me.profile);
      const data = await apiFetch('/api/admin/bookings', { token });
      setBookings(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [router]);

  async function runConfirmedAction() {
    if (!confirm) return;
    const { path, id, successMessage } = confirm;
    setConfirm(null);
    setActionLoading(id);
    setError('');
    setMessage('');
    try {
      const token = getAccessToken();
      await apiFetch(path, { method: 'POST', token });
      setMessage(successMessage);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  function renderActions(b) {
    const busy = actionLoading === b.id;
    const payoutBtn = b.status === 'completed_by_fan' && (
      <button
        type="button"
        className="btn btnPrimary"
        disabled={busy}
        aria-busy={busy || undefined}
        onClick={() => setConfirm({
          path: `/api/admin/bookings/${b.id}/payout`,
          id: b.id,
          title: 'Release payout?',
          message: 'This releases funds to the artist linked account.',
          confirmLabel: 'Release payout',
          successMessage: 'Payout released.',
        })}
      >
        {busy ? 'Working...' : 'Release Payout'}
      </button>
    );
    const refundBtn = ['pending', 'confirmed', 'completed_by_fan'].includes(b.status) && (
      <button
        type="button"
        className="btn btnDanger"
        disabled={busy}
        onClick={() => setConfirm({
          path: `/api/admin/bookings/${b.id}/refund`,
          id: b.id,
          title: 'Refund booking?',
          message: 'This refunds the fan and cannot be undone easily.',
          confirmLabel: 'Refund',
          successMessage: 'Refund processed.',
        })}
      >
        {busy ? 'Working...' : 'Refund'}
      </button>
    );

    if (!payoutBtn && !refundBtn) return null;
    return (
      <>
        {payoutBtn}
        {refundBtn}
      </>
    );
  }

  const isSuperadmin = profile?.role === 'superadmin';

  return (
    <div>
      <h1 className="pageTitle">Booking Audit</h1>
      <p className="pageSubtitle">System-wide booking and payment visibility</p>

      <FormAlert type="error">{error}</FormAlert>
      <FormAlert type="success">{message}</FormAlert>

      {loading ? (
        <p>Loading...</p>
      ) : bookings.length === 0 ? (
        <p>No bookings found.</p>
      ) : (
        <>
          <div className={`desktopOnly ${styles.tableWrap}`}>
            <table className="table">
              <thead>
                <tr>
                  <th>Fan</th>
                  <th>Artist</th>
                  <th>Event Date</th>
                  <th>Total</th>
                  <th>Commission %</th>
                  <th>Status</th>
                  {isSuperadmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td>
                      {b.fan?.name}
                      <br />
                      <span className={styles.email}>{b.fan?.email}</span>
                    </td>
                    <td>
                      {b.artist?.name}
                      <br />
                      <span className={styles.email}>{b.artist?.email}</span>
                    </td>
                    <td>{new Date(b.event_date).toLocaleDateString()}</td>
                    <td>₹{Number(b.total_amount).toLocaleString()}</td>
                    <td>{b.commission_rate_snapshot}%</td>
                    <td>
                      <span className={`statusBadge ${statusClass(b.status)}`}>
                        {statusLabel(b.status)}
                      </span>
                    </td>
                    {isSuperadmin && (
                      <td className={styles.actions}>{renderActions(b)}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mobileOnly dataCardList">
            {bookings.map((b) => {
              const actions = isSuperadmin ? renderActions(b) : null;
              return (
                <article key={b.id} className="dataCard">
                  <div className="dataCardTop">
                    <div>
                      <h3 className="dataCardTitle">{b.artist?.name || 'Artist'}</h3>
                      <p className="dataCardMeta">
                        {new Date(b.event_date).toLocaleDateString()}
                        {' · '}
                        ₹{Number(b.total_amount).toLocaleString()}
                      </p>
                      <p className="dataCardMeta">Fan: {b.fan?.name || '—'}</p>
                    </div>
                    <span className={`statusBadge ${statusClass(b.status)}`}>
                      {statusLabel(b.status)}
                    </span>
                  </div>

                  {actions && <div className="dataCardActions">{actions}</div>}

                  <details className="dataCardDetails">
                    <summary>Details</summary>
                    <dl className="dataCardDl">
                      <dt>Fan email</dt>
                      <dd>{b.fan?.email || '—'}</dd>
                      <dt>Artist email</dt>
                      <dd>{b.artist?.email || '—'}</dd>
                      <dt>Commission</dt>
                      <dd>{b.commission_rate_snapshot}%</dd>
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
