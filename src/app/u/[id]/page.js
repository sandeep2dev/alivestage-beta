'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import FormAlert from '@/components/FormAlert/FormAlert';
import EventCard from '@/components/EventCard/EventCard';
import ProfileAvatar from '@/components/ProfileAvatar/ProfileAvatar';
import { SkeletonList } from '@/components/Skeleton/Skeleton';
import { apiFetch } from '@/lib/api';
import styles from './user.module.css';

export default function PublicUserPage() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [profileData, eventsData] = await Promise.all([
          apiFetch(`/api/auth/users/${id}`),
          apiFetch(`/api/auth/users/${id}/events`),
        ]);
        setProfile(profileData.profile);
        setEvents(eventsData.events || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (error) {
    return (
      <div className={`container ${styles.page}`}>
        <FormAlert type="error">{error}</FormAlert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`container ${styles.page}`}>
        <SkeletonList count={2} />
      </div>
    );
  }

  const rep = profile.reputation;

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.header}>
        <ProfileAvatar profile={profile} size="lg" />
        <div>
          <h1 className="pageTitle">{profile.name}</h1>
          <p className={styles.meta}>{profile.city || 'City not set'}</p>
          <p className={styles.rep}>
            {rep?.enough
              ? `Reputation ${rep.display} · ${rep.rating_count} ratings`
              : 'Not enough ratings yet'}
          </p>
        </div>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Jams</h2>
        {events.length === 0 ? (
          <p className={styles.empty}>No public jams yet.</p>
        ) : (
          <ul className={styles.list}>
            {events.map((event) => (
              <li key={event.id}>
                <EventCard event={event} variant="compact" />
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link href="/events" className="btn btnSecondary">
        Browse feed
      </Link>
    </div>
  );
}
