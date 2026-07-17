'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import HelpDialog from '@/components/HelpDialog/HelpDialog';
import Logo from '@/components/Logo/Logo';
import ProfileAvatar from '@/components/ProfileAvatar/ProfileAvatar';
import styles from './ArtistSidebar.module.css';

const NAV = [
  { href: '/dashboard', label: 'Overview', exact: true },
  { href: '/dashboard/bookings', label: 'My bookings' },
  { href: '/dashboard/earnings', label: 'Earnings' },
  { href: '/dashboard/settings', label: 'Settings' },
];

export default function ArtistSidebar({ open, onClose, onSignOut, profile }) {
  const pathname = usePathname();
  const [helpOpen, setHelpOpen] = useState(false);

  function isActive(item) {
    if (item.exact) return pathname === item.href;
    if (item.href === '/dashboard/bookings') {
      return pathname === '/dashboard/bookings' || pathname.startsWith('/dashboard/bookings/');
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  return (
    <>
      {open && (
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Close menu"
          onClick={onClose}
        />
      )}
      <aside
        id="artist-sidebar"
        className={`${styles.sidebar} ${open ? styles.open : ''}`}
        aria-label="Artist navigation"
      >
        <div className={styles.top}>
          <div className={styles.brandBlock}>
            <Logo variant="full" href="/dashboard" size="md" onClick={onClose} />
            <div className={styles.profile} title={profile?.email || profile?.name}>
              <ProfileAvatar profile={profile} size="sm" />
              <span className={styles.profileName}>{profile?.name || 'Artist'}</span>
            </div>
          </div>
          <button type="button" className={styles.closeMobile} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <nav className={styles.nav}>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.link} ${isActive(item) ? styles.active : ''}`}
              onClick={onClose}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.bottom}>
          <Link
            href="/dashboard/bookings/new"
            className={`btn btnPrimary ${styles.addBtn}`}
            onClick={onClose}
          >
            Add new booking
          </Link>
          <button
            type="button"
            className={styles.textBtn}
            onClick={() => {
              onClose();
              setHelpOpen(true);
            }}
          >
            Help
          </button>
          <button type="button" className={styles.textBtn} onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </aside>

      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
