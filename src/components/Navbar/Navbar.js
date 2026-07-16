'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { clearAccessToken, getAccessToken } from '@/lib/auth';
import FanDrawer from '@/components/FanDrawer/FanDrawer';
import HelpDialog from '@/components/HelpDialog/HelpDialog';
import ProfileAvatar from '@/components/ProfileAvatar/ProfileAvatar';
import styles from './Navbar.module.css';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const isArtistDashboard = pathname === '/dashboard' || pathname.startsWith('/dashboard/');

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
    setHelpOpen(false);
  }, [pathname]);

  function handleSignOut() {
    clearAccessToken();
    setProfile(null);
    setDrawerOpen(false);
    setHelpOpen(false);
    router.push('/');
    router.refresh();
  }

  const isFan = profile?.role === 'fan';
  const isArtist = profile?.role === 'artist';
  const isAdmin = profile && ['admin', 'superadmin'].includes(profile.role);

  // Artist dashboard owns its chrome (sidebar); no top navbar there.
  if (isArtist && isArtistDashboard) {
    return null;
  }

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
              <Link href="/dashboard" className={styles.dashboardLink}>
                Dashboard
              </Link>
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
            onHelp={() => {
              setDrawerOpen(false);
              setHelpOpen(true);
            }}
            onSignOut={handleSignOut}
          />
          <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
        </>
      )}
    </>
  );
}
