'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import FormAlert from '@/components/FormAlert/FormAlert';
import EventCard from '@/components/EventCard/EventCard';
import { SkeletonList } from '@/components/Skeleton/Skeleton';
import { apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import styles from './page.module.css';

export default function HomePage() {
  const { openAuth } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      const token = getAccessToken();
      setSignedIn(Boolean(token));
      try {
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
        <p className="pageSubtitle">Local sessions near you.</p>
      </header>

      <FormAlert type="error">{error}</FormAlert>

      {loading ? (
        <SkeletonList count={3} />
      ) : events.length === 0 ? (
        <div className={styles.empty}>
          <p>No open jams yet.</p>
          <div className={styles.emptyActions}>
            {!signedIn && (
              <button type="button" className="btn btnSecondary" onClick={() => openAuth()}>
                Sign in
              </button>
            )}
            <Link href="/events/new" className="btn btnPrimary">
              Host a jam
            </Link>
          </div>
        </div>
      ) : (
        <ul className={styles.list}>
          {events.map((event) => (
            <li key={event.id}>
              <EventCard event={event} variant="feed" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
