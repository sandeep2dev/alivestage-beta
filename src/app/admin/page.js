'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { statusClass, statusLabel } from '@/lib/status';
import styles from './bookings.module.css';

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    const token = getAccessToken();
    if (!token) return;

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
  }, []);

  async function handleAction(path, id) {
    setActionLoading(id);
    try {
      const token = getAccessToken();
      await apiFetch(path, { method: 'POST', token });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  const isSuperadmin = profile?.role === 'superadmin';

  return (
    <div>
      <h1 className="pageTitle">Booking Audit</h1>
      <p className="pageSubtitle">System-wide booking and payment visibility</p>

      {error && <div className="alert alertError">{error}</div>}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className={styles.tableWrap}>
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
                  <td>{b.fan?.name}<br /><span className={styles.email}>{b.fan?.email}</span></td>
                  <td>{b.artist?.name}<br /><span className={styles.email}>{b.artist?.email}</span></td>
                  <td>{new Date(b.event_date).toLocaleDateString()}</td>
                  <td>₹{Number(b.total_amount).toLocaleString()}</td>
                  <td>{b.commission_rate_snapshot}%</td>
                  <td>
                    <span className={`statusBadge ${statusClass(b.status)}`}>
                      {statusLabel(b.status)}
                    </span>
                  </td>
                  {isSuperadmin && (
                    <td className={styles.actions}>
                      {b.status === 'completed_by_fan' && (
                        <button
                          type="button"
                          className="btn btnPrimary"
                          disabled={actionLoading === b.id}
                          onClick={() => handleAction(`/api/admin/bookings/${b.id}/payout`, b.id)}
                        >
                          Release Payout
                        </button>
                      )}
                      {['pending', 'confirmed', 'completed_by_fan'].includes(b.status) && (
                        <button
                          type="button"
                          className="btn btnDanger"
                          disabled={actionLoading === b.id}
                          onClick={() => handleAction(`/api/admin/bookings/${b.id}/refund`, b.id)}
                        >
                          Refund
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
