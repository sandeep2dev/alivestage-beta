'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import FormAlert from '@/components/FormAlert/FormAlert';
import { apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import styles from './my-events.module.css';

function formatWhen(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function EventList({ title, events }) {
  if (!events?.length) {
    return (
      <section className={styles.section}>
        <h2>{title}</h2>
        <p className={styles.empty}>None yet.</p>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <h2>{title}</h2>
      <ul className={styles.list}>
        {events.map((event) => (
          <li key={event.id}>
            <Link href={`/events/${event.id}`} className={styles.card}>
              <span className={styles.status}>{event.status}</span>
              <strong>{event.title}</strong>
              <span className={styles.meta}>
                {event.city} · {formatWhen(event.start_at)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function MyEventsPage() {
  const router = useRouter();
  const [hosting, setHosting] = useState([]);
  const [joining, setJoining] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const token = getAccessToken();
      if (!token) {
        router.replace('/auth');
        return;
      }
      try {
        const data = await apiFetch('/api/events/mine', { token });
        setHosting(data.hosting || []);
        setJoining(data.joining || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.header}>
        <h1 className="pageTitle">My events</h1>
        <Link href="/events/new" className="btn btnPrimary">
          Host a jam
        </Link>
      </header>

      <FormAlert type="error">{error}</FormAlert>
      {loading ? (
        <p>Loading…</p>
      ) : (
        <>
          <EventList title="Hosting" events={hosting} />
          <EventList title="Joining" events={joining} />
        </>
      )}
    </div>
  );
}
