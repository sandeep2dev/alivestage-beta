'use client';

import ProfileAvatar from '@/components/ProfileAvatar/ProfileAvatar';
import styles from './ProfileHeader.module.css';

function formatReputation(profile) {
  if (profile?.reputation) {
    const { enough, display, rating_count: count } = profile.reputation;
    if (enough) {
      return `Reputation ${display} · ${count} ratings`;
    }
    return 'Not enough ratings yet';
  }

  const count = profile?.rating_count || 0;
  const score = profile?.reputation_score;
  if (count >= 10 && score != null) {
    return `Reputation ${score} · ${count} ratings`;
  }
  return 'Not enough ratings yet';
}

/**
 * @param {object} props
 * @param {object} props.profile
 * @param {string} [props.subtitle] — defaults to profile.city
 * @param {string} [props.title] — defaults to profile.name
 * @param {string} [props.className]
 */
export default function ProfileHeader({
  profile,
  subtitle,
  title,
  className = '',
}) {
  const displayName = title || profile?.name || 'Profile';
  const displaySubtitle = subtitle ?? profile?.city ?? 'City not set';

  return (
    <header className={`${styles.header} ${className}`.trim()}>
      <div className={styles.identity}>
        <ProfileAvatar profile={profile} size="xl" />
        <div className={styles.details}>
          <h1 className={styles.name}>{displayName}</h1>
          <p className={styles.subtitle}>{displaySubtitle}</p>
        </div>
      </div>
      <p className={styles.reputation}>{formatReputation(profile)}</p>
    </header>
  );
}
