'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import ConfirmationModal from '@/components/ConfirmationModal/ConfirmationModal';
import styles from './Settings.module.css';

export default function AdminSettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [commission, setCommission] = useState('10');
  const [pendingRate, setPendingRate] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    const token = getAccessToken();
    if (!token) return;

    try {
      const me = await apiFetch('/api/auth/me', { token });
      setProfile(me.profile);

      if (me.profile?.role !== 'superadmin') {
        router.push('/admin');
        return;
      }

      const [settings, artistList] = await Promise.all([
        apiFetch('/api/admin/settings', { token }),
        apiFetch('/api/admin/artists', { token }),
      ]);
      setCommission(String(settings.commission_percentage));
      setArtists(artistList);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [router]);

  function handleUpdateClick() {
    setPendingRate(commission);
    setShowConfirm(true);
  }

  async function confirmUpdate() {
    setShowConfirm(false);
    try {
      const token = getAccessToken();
      await apiFetch('/api/admin/settings/commission', {
        method: 'PATCH',
        token,
        body: { commissionPercentage: Number(pendingRate) },
      });
      setMessage('Commission rate updated successfully.');
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function updatePayoutAccount(artistId, value) {
    try {
      const token = getAccessToken();
      await apiFetch(`/api/admin/artists/${artistId}/payout-account`, {
        method: 'PATCH',
        token,
        body: { razorpayLinkedAccountId: value },
      });
      setMessage('Payout account updated.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p>Loading...</p>;
  if (profile?.role !== 'superadmin') return null;

  return (
    <div>
      <h1 className="pageTitle">Platform Settings</h1>
      <p className="pageSubtitle">Superadmin configuration panel</p>

      {error && <div className="alert alertError">{error}</div>}
      {message && <div className="alert alertSuccess">{message}</div>}

      <section className={`card ${styles.section}`}>
        <h2 className={styles.sectionTitle}>Commission Rate</h2>
        <div className={styles.commissionRow}>
          <div className={styles.inputWrap}>
            <label className="label" htmlFor="commission">Platform commission (%)</label>
            <input
              id="commission"
              type="number"
              className="input"
              min="0"
              max="100"
              step="0.01"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
            />
          </div>
          <button type="button" className="btn btnPrimary" onClick={handleUpdateClick}>
            Update Rate
          </button>
        </div>
      </section>

      <section className={`card ${styles.section}`}>
        <h2 className={styles.sectionTitle}>Artist Payout Accounts</h2>
        <p className={styles.hint}>Set Razorpay Route linked account IDs for artist payouts.</p>
        <div className={styles.artistList}>
          {artists.map((a) => (
            <div key={a.id} className={styles.artistRow}>
              <span>{a.profile?.name || a.id}</span>
              <input
                className="input"
                placeholder="acc_xxxxxxxx"
                defaultValue={a.razorpay_linked_account_id || ''}
                onBlur={(e) => {
                  if (e.target.value !== (a.razorpay_linked_account_id || '')) {
                    updatePayoutAccount(a.id, e.target.value);
                  }
                }}
              />
            </div>
          ))}
        </div>
      </section>

      <ConfirmationModal
        open={showConfirm}
        title="Confirm Commission Change"
        message="This changes the fee for future bookings. Existing unsettled bookings will retain their original commission rate snapshot."
        confirmLabel="Confirm Change"
        onConfirm={confirmUpdate}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
