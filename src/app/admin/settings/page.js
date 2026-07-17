'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { isRazorpayAccountId, parseMoney } from '@/lib/validators';
import ConfirmationModal from '@/components/ConfirmationModal/ConfirmationModal';
import FormAlert from '@/components/FormAlert/FormAlert';
import FormField from '@/components/FormField/FormField';
import styles from './Settings.module.css';

export default function AdminSettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [commission, setCommission] = useState('10');
  const [pendingRate, setPendingRate] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [artists, setArtists] = useState([]);
  const [payoutDrafts, setPayoutDrafts] = useState({});
  const [payoutErrors, setPayoutErrors] = useState({});
  const [savingArtistId, setSavingArtistId] = useState(null);
  const [savingCommission, setSavingCommission] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [commissionError, setCommissionError] = useState('');

  async function load() {
    const token = getAccessToken();
    if (!token) {
      router.replace('/auth');
      return;
    }

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
      const drafts = {};
      artistList.forEach((a) => {
        drafts[a.id] = a.razorpay_linked_account_id || '';
      });
      setPayoutDrafts(drafts);
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
    setMessage('');
    setError('');
    const check = parseMoney(commission, { label: 'Commission', min: 0, max: 100 });
    if (!check.ok) {
      setCommissionError(check.message);
      return;
    }
    setCommissionError('');
    setPendingRate(check.value);
    setShowConfirm(true);
  }

  async function confirmUpdate() {
    setShowConfirm(false);
    setSavingCommission(true);
    setError('');
    setMessage('');
    try {
      const token = getAccessToken();
      await apiFetch('/api/admin/settings/commission', {
        method: 'PATCH',
        token,
        body: { commissionPercentage: Number(pendingRate) },
      });
      setCommission(String(pendingRate));
      setMessage('Commission rate updated successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingCommission(false);
    }
  }

  async function savePayoutAccount(artistId) {
    const value = payoutDrafts[artistId] ?? '';
    const check = isRazorpayAccountId(value);
    if (!check.ok) {
      setPayoutErrors((prev) => ({ ...prev, [artistId]: check.message }));
      return;
    }
    setPayoutErrors((prev) => ({ ...prev, [artistId]: '' }));
    setSavingArtistId(artistId);
    setError('');
    setMessage('');
    try {
      const token = getAccessToken();
      await apiFetch(`/api/admin/artists/${artistId}/payout-account`, {
        method: 'PATCH',
        token,
        body: { razorpayLinkedAccountId: check.value },
      });
      setMessage('Payout account updated.');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingArtistId(null);
    }
  }

  if (loading) return <p>Loading...</p>;
  if (profile?.role !== 'superadmin') return null;

  return (
    <div>
      <h1 className="pageTitle">Platform Settings</h1>
      <p className="pageSubtitle">Superadmin configuration panel</p>

      <FormAlert type="error">{error}</FormAlert>
      <FormAlert type="success">{message}</FormAlert>

      <section className={`card ${styles.section}`}>
        <h2 className={styles.sectionTitle}>Commission Rate</h2>
        <div className={styles.commissionRow}>
          <div className={styles.inputWrap}>
            <FormField id="commission" label="Platform commission (%)" required error={commissionError} noBottomMargin>
              <input
                type="number"
                className="input"
                min={0}
                max={100}
                step="0.01"
                value={commission}
                onChange={(e) => {
                  setCommission(e.target.value);
                  setCommissionError('');
                }}
              />
            </FormField>
          </div>
          <button
            type="button"
            className="btn btnPrimary"
            disabled={savingCommission}
            onClick={handleUpdateClick}
          >
            {savingCommission ? 'Saving...' : 'Update Rate'}
          </button>
        </div>
      </section>

      <section className={`card ${styles.section}`}>
        <h2 className={styles.sectionTitle}>Artist Payout Accounts</h2>
        <p className={styles.hint}>Set Razorpay Route linked account IDs for artist payouts.</p>
        {artists.length === 0 ? (
          <p>No artists found.</p>
        ) : (
          <div className={styles.artistList}>
            {artists.map((a) => {
              const inputId = `payout-${a.id}`;
              return (
                <div key={a.id} className={styles.artistRow}>
                  <label className="label" htmlFor={inputId}>{a.profile?.name || a.id}</label>
                  <input
                    id={inputId}
                    className={`input ${payoutErrors[a.id] ? 'inputError' : ''}`}
                    placeholder="acc_xxxxxxxx"
                    value={payoutDrafts[a.id] ?? ''}
                    aria-invalid={payoutErrors[a.id] ? true : undefined}
                    onChange={(e) => {
                      setPayoutDrafts((prev) => ({ ...prev, [a.id]: e.target.value }));
                      setPayoutErrors((prev) => ({ ...prev, [a.id]: '' }));
                    }}
                  />
                  <button
                    type="button"
                    className="btn btnSecondary"
                    disabled={savingArtistId === a.id}
                    onClick={() => savePayoutAccount(a.id)}
                  >
                    {savingArtistId === a.id ? 'Saving...' : 'Save'}
                  </button>
                  {payoutErrors[a.id] && (
                    <p className="fieldError" role="alert">{payoutErrors[a.id]}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
