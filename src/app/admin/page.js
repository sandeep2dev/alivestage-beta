'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import FormAlert from '@/components/FormAlert/FormAlert';
import ConfirmationModal from '@/components/ConfirmationModal/ConfirmationModal';
import { apiFetch } from '@/lib/api';
import { getAccessToken, clearAccessToken } from '@/lib/auth';
import styles from './admin.module.css';

export default function AdminPage() {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/auth');
      return;
    }
    try {
      const me = await apiFetch('/api/auth/me', { token });
      if (me.profile?.role !== 'admin') {
        router.replace('/');
        return;
      }
      const [ev, us] = await Promise.all([
        apiFetch('/api/admin/events', { token }),
        apiFetch('/api/admin/users', { token }),
      ]);
      setEvents(ev.events || []);
      setUsers(us.users || []);
    } catch (err) {
      if (String(err.message || '').includes('Admin')) {
        router.replace('/');
        return;
      }
      setError(err.message);
      if (String(err.message || '').includes('Authentication')) {
        clearAccessToken();
        router.replace('/auth');
      }
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(fn, successMsg) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await fn();
      await load();
      if (successMsg) setMessage(successMsg);
    } catch (err) {
      setError(err.message || 'Action failed');
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  return (
    <div className={`container ${styles.page}`}>
      <h1 className="pageTitle">Admin</h1>
      <FormAlert type="error">{error}</FormAlert>
      <FormAlert type="success">{message}</FormAlert>

      <section className={styles.section}>
        <h2>Recent events</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Title</th>
                <th>City</th>
                <th>Status</th>
                <th>Start</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td>
                    <Link href={`/events/${e.id}`}>{e.title}</Link>
                  </td>
                  <td>{e.city}</td>
                  <td>{e.status}</td>
                  <td>{new Date(e.start_at).toLocaleString()}</td>
                  <td>
                    {['created', 'live'].includes(e.status) ? (
                      <button
                        type="button"
                        className={styles.linkBtn}
                        disabled={busy}
                        onClick={() =>
                          setConfirm({
                            title: 'Force-cancel event?',
                            body: 'Joiners get a full ₹50 refund. Host create fee is not refunded.',
                            onConfirm: () =>
                              run(async () => {
                                const token = getAccessToken();
                                await apiFetch(`/api/admin/events/${e.id}/cancel`, {
                                  method: 'POST',
                                  token,
                                });
                              }, 'Event cancelled.'),
                          })
                        }
                      >
                        Cancel
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Recent users</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>City</th>
                <th>Role</th>
                <th>Ratings</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <Link href={`/u/${u.id}`}>{u.name}</Link>
                    {u.banned_at ? <span className={styles.banned}> banned</span> : null}
                  </td>
                  <td>{u.email}</td>
                  <td>{u.city}</td>
                  <td>{u.role}</td>
                  <td>{u.rating_count}</td>
                  <td className={styles.actions}>
                    <button
                      type="button"
                      className={styles.linkBtn}
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          const token = getAccessToken();
                          await apiFetch(`/api/admin/users/${u.id}/role`, {
                            method: 'POST',
                            token,
                            body: { role: u.role === 'admin' ? 'member' : 'admin' },
                          });
                        }, 'Role updated.')
                      }
                    >
                      {u.role === 'admin' ? 'Demote' : 'Promote'}
                    </button>
                    <button
                      type="button"
                      className={styles.linkBtn}
                      disabled={busy}
                      onClick={() =>
                        setConfirm({
                          title: u.banned_at ? 'Unban user?' : 'Ban user?',
                          body: u.banned_at
                            ? 'They will be able to sign in again.'
                            : 'They will be blocked from authenticated actions.',
                          onConfirm: () =>
                            run(async () => {
                              const token = getAccessToken();
                              await apiFetch(`/api/admin/users/${u.id}/ban`, {
                                method: 'POST',
                                token,
                                body: { banned: !u.banned_at },
                              });
                            }, u.banned_at ? 'User unbanned.' : 'User banned.'),
                        })
                      }
                    >
                      {u.banned_at ? 'Unban' : 'Ban'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {confirm && (
        <ConfirmationModal
          open
          title={confirm.title}
          message={confirm.body}
          confirmLabel="Confirm"
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
