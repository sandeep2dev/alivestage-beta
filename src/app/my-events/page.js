'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import FormAlert from '@/components/FormAlert/FormAlert';
import EventCard from '@/components/EventCard/EventCard';
import { SkeletonList } from '@/components/Skeleton/Skeleton';
import { apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import styles from './my-events.module.css';

function EventList({ title, events, emptyHint, emptyActions }) {
  if (!events?.length) {
    return (
      <section className={styles.section}>
        <h2>{title}</h2>
        <div className={styles.empty}>
          <p>{emptyHint}</p>
          {emptyActions}
        </div>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <h2>{title}</h2>
      <ul className={styles.list}>
        {events.map((event) => (
          <li key={event.id}>
            <EventCard event={event} variant="compact" />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function MyEventsPage() {
  const { openAuth } = useAuth();
  const [hosting, setHosting] = useState([]);
  const [joining, setJoining] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      openAuth({ onSuccess: () => load() });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch('/api/events/mine', { token });
      setHosting(data.hosting || []);
      setJoining(data.joining || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [openAuth]);

  useEffect(() => {
    load();
  }, [load]);

  const browseBtn = (
    <Link href="/" className="btn btnSecondary">
      Browse feed
    </Link>
  );
  const hostBtn = (
    <Link href="/events/new" className="btn btnPrimary">
      Host a jam
    </Link>
  );

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.header}>
        <h1 className="pageTitle">My jams</h1>
        <Link href="/events/new" className="btn btnPrimary">
          Host a jam
        </Link>
      </header>

      <FormAlert type="error">{error}</FormAlert>
      {loading ? (
        <SkeletonList count={2} />
      ) : (
        <>
          <EventList
            title="Hosting"
            events={hosting}
            emptyHint="You haven't hosted a jam yet."
            emptyActions={
              <div className={styles.emptyActions}>
                {browseBtn}
                {hostBtn}
              </div>
            }
          />
          <EventList
            title="Joining"
            events={joining}
            emptyHint="You haven't joined a jam yet."
            emptyActions={
              <div className={styles.emptyActions}>
                {browseBtn}
              </div>
            }
          />
        </>
      )}
    </div>
  );
}
