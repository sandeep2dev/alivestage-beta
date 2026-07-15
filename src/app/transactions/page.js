'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { paymentTypeLabel, statusClass, statusLabel } from '@/lib/status';
import FormAlert from '@/components/FormAlert/FormAlert';
import styles from './transactions.module.css';

export default function TransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const token = getAccessToken();
      if (!token) {
        router.replace('/auth');
        return;
      }
      try {
        const me = await apiFetch('/api/auth/me', { token });
        if (me.profile?.role !== 'fan') {
          router.replace('/');
          return;
        }
        const data = await apiFetch('/api/transactions', { token });
        setTransactions(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  if (loading) {
    return <div className="container"><p>Loading...</p></div>;
  }

  return (
    <div className={`container ${styles.page}`}>
      <h1 className="pageTitle">Transactions</h1>
      <p className="pageSubtitle">Payments you have made on Alivestage</p>

      <FormAlert type="error">{error}</FormAlert>

      {transactions.length === 0 ? (
        <div className={styles.empty}>
          <p>No transactions yet.</p>
          <Link href="/" className="btn btnPrimary">Discover artists</Link>
        </div>
      ) : (
        <div className={styles.list}>
          {transactions.map((tx) => (
            <article key={tx.id} className={`card ${styles.card}`}>
              <div className={styles.row}>
                <div>
                  <h2 className={styles.title}>
                    {paymentTypeLabel(tx.paymentType)} · {tx.artist?.name || 'Artist'}
                  </h2>
                  <p className={styles.meta}>
                    {tx.updatedAt ? new Date(tx.updatedAt).toLocaleString() : '—'}
                  </p>
                  {tx.eventDate && (
                    <p className={styles.meta}>
                      Event: {new Date(tx.eventDate).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className={styles.right}>
                  <span className={styles.amount}>
                    ₹{Number(tx.amount || 0).toLocaleString()}
                  </span>
                  <span className={`statusBadge ${statusClass(tx.status)}`}>
                    {statusLabel(tx.status)}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
