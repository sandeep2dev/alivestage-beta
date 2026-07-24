'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import FormAlert from '@/components/FormAlert/FormAlert';
import ProfileAvatar from '@/components/ProfileAvatar/ProfileAvatar';
import { apiFetch } from '@/lib/api';
import styles from './user.module.css';

export default function PublicUserPage() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch(`/api/auth/users/${id}`);
        setProfile(data.profile);
      } catch (err) {
        setError(err.message);
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

  if (!profile) {
    return (
      <div className={`container ${styles.page}`}>
        <p>Loading…</p>
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
          <p className={styles.meta}>
            {profile.city || 'City not set'}
            {profile.discord_username ? ` · @${profile.discord_username}` : ''}
          </p>
          <p className={styles.rep}>
            {rep?.enough
              ? `Reputation ${rep.display} · ${rep.rating_count} ratings`
              : 'Not enough ratings yet'}
          </p>
        </div>
      </div>
    </div>
  );
}
