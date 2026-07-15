'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { clearAccessToken, getAccessToken } from '@/lib/auth';
import FanDrawer from '@/components/FanDrawer/FanDrawer';
import ProfileAvatar from '@/components/ProfileAvatar/ProfileAvatar';
import SupportDialog from '@/components/SupportDialog/SupportDialog';
import styles from './Navbar.module.css';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

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
    setDrawerOpen(false);
    setSupportOpen(false);
  }, [pathname]);

  function handleSignOut() {
    clearAccessToken();
    setProfile(null);
    setDrawerOpen(false);
    setSupportOpen(false);
    router.push('/');
    router.refresh();
  }

  const isFan = profile?.role === 'fan';
  const isArtist = profile?.role === 'artist';
  const isAdmin = profile && ['admin', 'superadmin'].includes(profile.role);

  return (
    <>
      <header className={styles.navbar}>
        <div className={`container ${styles.inner}`}>
          <Link href="/" className={styles.logo}>Alivestage</Link>

          <div className={styles.right}>
            {!profile && (
              <Link href="/auth" className={`btn btnPrimary ${styles.authBtn}`}>Sign In</Link>
            )}

            {isAdmin && (
              <Link href="/admin" className={styles.link}>Admin</Link>
            )}

            {isArtist && profile && (
              <div className={styles.artistMenu}>
                <div className={styles.artistChip} title={profile.email || profile.name}>
                  <ProfileAvatar profile={profile} size="sm" />
                  <span className={styles.artistName}>{profile.name || 'Artist'}</span>
                </div>
                <button type="button" className={styles.signOutLink} onClick={handleSignOut}>
                  Sign out
                </button>
              </div>
            )}

            {isFan && profile && (
              <button
                type="button"
                className={styles.profileButton}
                onClick={() => setDrawerOpen(true)}
                aria-label="Open account menu"
                aria-haspopup="dialog"
                aria-expanded={drawerOpen}
              >
                <ProfileAvatar profile={profile} />
              </button>
            )}

            {isAdmin && !isFan && !isArtist && profile && (
              <button type="button" className="btn btnSecondary" onClick={handleSignOut}>
                Sign Out
              </button>
            )}
          </div>
        </div>
      </header>

      {isFan && (
        <>
          <FanDrawer
            open={drawerOpen}
            profile={profile}
            onClose={() => setDrawerOpen(false)}
            onSupport={() => {
              setDrawerOpen(false);
              setSupportOpen(true);
            }}
            onSignOut={handleSignOut}
          />
          <SupportDialog open={supportOpen} onClose={() => setSupportOpen(false)} />
        </>
      )}
    </>
  );
}
