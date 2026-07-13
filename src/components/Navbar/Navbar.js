'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { clearAccessToken, getAccessToken } from '@/lib/auth';
import styles from './Navbar.module.css';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    async function load() {
      const token = getAccessToken();
      if (!token) {
        setProfile(null);
        return;
      }
      try {
        const data = await apiFetch('/api/auth/me', { token });
        setProfile(data.profile);
      } catch {
        clearAccessToken();
        setProfile(null);
      }
    }
    load();
  }, [pathname]);

  function handleSignOut() {
    clearAccessToken();
    setProfile(null);
    router.push('/');
    router.refresh();
  }

  return (
    <header className={styles.navbar}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.logo}>Alivestage</Link>
        <nav className={styles.nav}>
          <Link href="/" className={styles.link}>Discover</Link>
          {profile && (
            <Link href="/dashboard" className={styles.link}>Dashboard</Link>
          )}
          {profile && ['admin', 'superadmin'].includes(profile.role) && (
            <Link href="/admin" className={styles.link}>Admin</Link>
          )}
          {!profile ? (
            <Link href="/auth" className={`btn btnPrimary ${styles.authBtn}`}>Sign In</Link>
          ) : (
            <button type="button" onClick={handleSignOut} className={`btn btnSecondary ${styles.authBtn}`}>
              Sign Out
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
