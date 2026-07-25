'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import FormAlert from '@/components/FormAlert/FormAlert';
import { apiFetch } from '@/lib/api';
import { getAccessToken, clearAccessToken } from '@/lib/auth';
import styles from './admin.module.css';

export default function AdminPage() {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
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
    }
    load();
  }, [router]);

  return (
    <div className={`container ${styles.page}`}>
      <h1 className="pageTitle">Admin</h1>
      <FormAlert type="error">{error}</FormAlert>

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
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td>{e.title}</td>
                  <td>{e.city}</td>
                  <td>{e.status}</td>
                  <td>{new Date(e.start_at).toLocaleString()}</td>
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
                <th>Ratings</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.city}</td>
                  <td>{u.rating_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
