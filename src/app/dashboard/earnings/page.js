'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { paymentTypeLabel, statusClass, statusLabel } from '@/lib/status';
import FormAlert from '@/components/FormAlert/FormAlert';
import styles from '../dashboard.module.css';

export default function ArtistEarningsPage() {
  const [lifetimePayout, setLifetimePayout] = useState(0);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const token = getAccessToken();
      if (!token) return;
      try {
        const data = await apiFetch('/api/earnings', { token });
        setLifetimePayout(Number(data.lifetimePayout) || 0);
        setPayments(data.payments || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className={styles.page}><p>Loading...</p></div>;

  return (
    <div className={styles.page}>
      <h1 className="pageTitle">Earnings</h1>
      <p className="pageSubtitle">Payments from platform bookings</p>

      <FormAlert type="error">{error}</FormAlert>

      <div className={`card ${styles.statCard} ${styles.earningsHero}`}>
        <span className={styles.statLabel}>Lifetime payout</span>
        <strong className={styles.statValue}>₹{lifetimePayout.toLocaleString()}</strong>
      </div>

      {payments.length === 0 ? (
        <div className={styles.empty}>
          <p>No paid gigs yet.</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className="table">
            <thead>
              <tr>
                <th>Fan</th>
                <th>Event</th>
                <th>Date</th>
                <th>Type</th>
                <th>Captured</th>
                <th>Commission</th>
                <th>Your payout</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{p.counterparty}</td>
                  <td className={styles.cellClamp}>{p.eventDetails || '—'}</td>
                  <td>{p.eventDate ? new Date(p.eventDate).toLocaleString() : '—'}</td>
                  <td>{paymentTypeLabel(p.paymentType)}</td>
                  <td>₹{Number(p.amountCaptured).toLocaleString()}</td>
                  <td>₹{Number(p.platformCommission).toLocaleString()}</td>
                  <td>₹{Number(p.artistPayout).toLocaleString()}</td>
                  <td>
                    <span className={`statusBadge ${statusClass(p.status)}`}>
                      {statusLabel(p.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
