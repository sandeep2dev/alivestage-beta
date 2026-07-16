'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ProfileAvatar from '@/components/ProfileAvatar/ProfileAvatar';
import styles from './FanDrawer.module.css';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/my-bookings', label: 'My bookings' },
  { href: '/transactions', label: 'Transactions' },
  { href: '/profile', label: 'Profile' },
];

export default function FanDrawer({ open, profile, onClose, onHelp, onSignOut }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.root}>
      <button type="button" className={styles.backdrop} aria-label="Close menu" onClick={onClose} />
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-label="Account menu">
        <div className={styles.header}>
          <ProfileAvatar profile={profile} size="lg" />
          <div className={styles.meta}>
            <strong className={styles.name}>{profile?.name || 'Fan'}</strong>
            <span className={styles.email}>{profile?.email}</span>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <nav className={styles.nav}>
          {LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.link} ${pathname === item.href ? styles.active : ''}`}
              onClick={onClose}
            >
              {item.label}
            </Link>
          ))}
          <button type="button" className={styles.linkButton} onClick={onHelp}>
            Help
          </button>
        </nav>

        <div className={styles.footer}>
          <button type="button" className="btn btnSecondary" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </aside>
    </div>
  );
}
