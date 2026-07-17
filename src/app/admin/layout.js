'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import styles from './admin.module.css';

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function load() {
      const token = getAccessToken();
      if (!token) {
        router.replace('/auth');
        return;
      }
      try {
        const data = await apiFetch('/api/auth/me', { token });
        if (!data.profile || !['admin', 'superadmin'].includes(data.profile.role)) {
          router.replace('/');
          return;
        }
        setProfile(data.profile);
        setReady(true);
      } catch {
        router.replace('/auth');
      }
    }
    load();
  }, [router]);

  if (!ready || !profile) {
    return <div className="container"><p>Loading...</p></div>;
  }

  const bookingsActive = pathname === '/admin';
  const settingsActive = pathname.startsWith('/admin/settings');

  return (
    <div className={styles.adminLayout}>
      <aside className={styles.sidebar}>
        <h2 className={styles.sidebarTitle}>Admin</h2>
        <nav className={styles.sidebarNav}>
          <a
            href="/admin"
            className={`${styles.sidebarLink} ${bookingsActive ? styles.sidebarLinkActive : ''}`}
          >
            Bookings
          </a>
          {profile.role === 'superadmin' && (
            <a
              href="/admin/settings"
              className={`${styles.sidebarLink} ${settingsActive ? styles.sidebarLinkActive : ''}`}
            >
              Settings
            </a>
          )}
        </nav>
      </aside>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
