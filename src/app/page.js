'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import FormAlert from '@/components/FormAlert/FormAlert';
import { apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import styles from './page.module.css';

function formatWhen(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function HomePage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const token = getAccessToken();
        const data = await apiFetch('/api/events/feed', { token: token || undefined });
        setEvents(data.events || []);
      } catch (err) {
        setEvents([]);
        setError(err.message || 'Failed to load jams');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.hero}>
        <h1 className="pageTitle">Upcoming jams</h1>
        <p className="pageSubtitle">
          Local sessions first when you&apos;re signed in with a city. Join with ₹50 — address unlocks after payment.
        </p>
      </header>

      <FormAlert type="error">{error}</FormAlert>

      {loading ? (
        <p className={styles.empty}>Loading feed…</p>
      ) : events.length === 0 ? (
        <div className={styles.empty}>
          <p>No open jams yet.</p>
          <Link href="/events/new" className="btn btnPrimary">
            Host the first one
          </Link>
        </div>
      ) : (
        <ul className={styles.list}>
          {events.map((event) => (
            <li key={event.id}>
              <Link href={`/events/${event.id}`} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.status}>{event.status}</span>
                  <span className={styles.city}>{event.city}</span>
                </div>
                <h2 className={styles.title}>{event.title}</h2>
                <p className={styles.summary}>{event.summary}</p>
                <div className={styles.meta}>
                  <span>{formatWhen(event.start_at)}</span>
                  <span>{event.duration_minutes} min</span>
                  {event.host?.name && <span>Host: {event.host.name}</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
