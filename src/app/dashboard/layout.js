'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { clearAccessToken, getAccessToken } from '@/lib/auth';
import ArtistSidebar from '@/components/ArtistSidebar/ArtistSidebar';
import Logo from '@/components/Logo/Logo';
import styles from './dashboard-shell.module.css';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const token = getAccessToken();
      if (!token) {
        router.replace('/auth');
        return;
      }
      try {
        const data = await apiFetch('/api/auth/me', { token });
        const role = data.profile?.role;
        if (role === 'fan') {
          router.replace('/my-bookings');
          return;
        }
        if (role !== 'artist') {
          router.replace('/');
          return;
        }
        if (!data.artistDetails?.is_onboarded) {
          router.replace('/onboarding');
          return;
        }
        setProfile(data.profile);
        setReady(true);
      } catch {
        clearAccessToken();
        router.replace('/auth');
      }
    }
    load();
  }, [router]);

  function handleSignOut() {
    clearAccessToken();
    setSidebarOpen(false);
    router.push('/');
    router.refresh();
  }

  if (!ready || !profile) {
    return <div className="container"><p>Loading...</p></div>;
  }

  return (
    <div className={styles.shell}>
      <header className={styles.mobileBar}>
        <Logo variant="full" href="/dashboard" size="md" />
        <button
          type="button"
          className={styles.hamburger}
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
          aria-expanded={sidebarOpen}
          aria-controls="artist-sidebar"
        >
          <span className={styles.hamburgerIcon} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
      </header>
      <ArtistSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSignOut={handleSignOut}
        profile={profile}
      />
      <div className={styles.main}>{children}</div>
    </div>
  );
}
