'use client';

import styles from './ProfileAvatar.module.css';

function initialsFromName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function ProfileAvatar({ profile, size = 'md', className = '' }) {
  const sizeClass = size === 'lg' ? styles.lg : size === 'sm' ? styles.sm : styles.md;
  const label = profile?.name || profile?.email || 'Account';

  if (profile?.role === 'artist' && profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={label}
        className={`${styles.avatar} ${sizeClass} ${className}`}
      />
    );
  }

  return (
    <span className={`${styles.avatar} ${styles.initials} ${sizeClass} ${className}`} aria-hidden="true">
      {initialsFromName(profile?.name || profile?.email)}
    </span>
  );
}
