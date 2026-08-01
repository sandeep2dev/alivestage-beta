'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';

export default function AdminLayout({ children }) {
  const router = useRouter();
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
        if (!data.profile || data.profile.role !== 'admin') {
          router.replace('/events');
          return;
        }
        setReady(true);
      } catch {
        router.replace('/auth');
      }
    }
    load();
  }, [router]);

  if (!ready) {
    return (
      <div className="container">
        <p>Loading…</p>
      </div>
    );
  }

  return children;
}
