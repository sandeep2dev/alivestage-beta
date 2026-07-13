'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAccessToken, setAccessToken } from '@/lib/auth';
import styles from './role.module.css';

export default function RoleSelectionPage() {
  const router = useRouter();
  const [role, setRole] = useState('fan');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getAccessToken()) {
      router.push('/auth');
    }
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
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`container ${styles.page}`}>
      <div className={`card ${styles.card}`}>
        <h1 className="pageTitle">Choose Your Role</h1>
        <p className={styles.subtitle}>How will you use Alivestage?</p>

        {error && <div className="alert alertError">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label className={`${styles.option} ${role === 'fan' ? styles.selected : ''}`}>
            <input
              type="radio"
              name="role"
              value="fan"
              checked={role === 'fan'}
              onChange={() => setRole('fan')}
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
            />
            <div>
              <strong>Artist</strong>
              <p>Manage your portfolio and accept bookings</p>
            </div>
          </label>

          <button type="submit" className="btn btnPrimary" disabled={loading}>
            {loading ? 'Saving...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
