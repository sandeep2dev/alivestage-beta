'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAccessToken, setAccessToken } from '@/lib/auth';
import FormAlert from '@/components/FormAlert/FormAlert';
import styles from './role.module.css';

export default function RoleSelectionPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState('fan');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function gate() {
      const token = getAccessToken();
      if (!token) {
        router.replace('/auth');
        return;
      }
      try {
        const data = await apiFetch('/api/auth/me', { token });
        if (data.profile?.onboarding_complete) {
          router.replace(data.profile.role === 'artist' ? '/onboarding' : '/');
          return;
        }
        setReady(true);
      } catch {
        router.replace('/auth');
      }
    }
    gate();
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const token = getAccessToken();
      if (!token) {
        router.push('/auth');
        return;
      }

      const data = await apiFetch('/api/auth/role', {
        method: 'POST',
        token,
        body: { role },
      });

      if (data.accessToken) {
        setAccessToken(data.accessToken);
      }

      if (role === 'artist') {
        router.push('/onboarding');
      } else {
        router.push('/');
      }
      router.refresh();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  if (!ready) {
    return <div className="container"><p>Loading...</p></div>;
  }

  return (
    <div className={`container ${styles.page}`}>
      <div className={`card ${styles.card}`}>
        <h1 className="pageTitle">Choose Your Role</h1>
        <p className={styles.subtitle}>How will you use Alivestage?</p>
        <p className="fieldHint" style={{ marginBottom: '1.5rem' }}>
          You can&apos;t change this later, so pick the role that fits how you&apos;ll use the platform.
        </p>

        <FormAlert type="error">{error}</FormAlert>

        <form onSubmit={handleSubmit}>
          <div role="radiogroup" aria-label="Account role">
            <label className={`${styles.option} ${role === 'fan' ? styles.selected : ''}`}>
              <input
                type="radio"
                name="role"
                value="fan"
                checked={role === 'fan'}
                onChange={() => setRole('fan')}
                disabled={loading}
              />
              <div>
                <strong>Fan</strong>
                <p>Search artists and book live performances</p>
              </div>
            </label>

            <label className={`${styles.option} ${role === 'artist' ? styles.selected : ''}`}>
              <input
                type="radio"
                name="role"
                value="artist"
                checked={role === 'artist'}
                onChange={() => setRole('artist')}
                disabled={loading}
              />
              <div>
                <strong>Artist</strong>
                <p>Manage your portfolio and accept bookings</p>
              </div>
            </label>
          </div>

          <button type="submit" className="btn btnPrimary" disabled={loading}>
            {loading ? 'Saving...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
