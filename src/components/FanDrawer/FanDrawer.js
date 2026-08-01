'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ProfileAvatar from '@/components/ProfileAvatar/ProfileAvatar';
import { lockScroll, unlockScroll } from '@/lib/scrollLock';
import styles from './FanDrawer.module.css';

const LINKS = [
  { href: '/events', label: 'Jam feed' },
  { href: '/my-events', label: 'My jams' },
  { href: '/events/new', label: 'Host a jam' },
  { href: '/profile', label: 'Profile' },
];

export default function FanDrawer({ open, profile, onClose, onHelp, onSignOut }) {
  const pathname = usePathname();
  const drawerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const scrollY = lockScroll();

    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };

    const onTouchMove = (e) => {
      if (drawerRef.current?.contains(e.target)) return;
      e.preventDefault();
    };

    window.addEventListener('keydown', onKey);
    document.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      unlockScroll(scrollY);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('touchmove', onTouchMove);
    };
  }, [open, onClose]);

  if (!open) return null;

  const needsOnboarding = profile && !profile.onboarding_complete;

  return (
    <div className={styles.root}>
      <button type="button" className={styles.backdrop} aria-label="Close menu" onClick={onClose} />
      <aside
        ref={drawerRef}
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label="Account menu"
      >
        <div className={styles.header}>
          <ProfileAvatar profile={profile} size="lg" />
          <div className={styles.meta}>
            <strong className={styles.name}>{profile?.name || 'Member'}</strong>
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
          {needsOnboarding && (
            <Link href="/onboarding" className={styles.link} onClick={onClose}>
              Finish setup
            </Link>
          )}
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
