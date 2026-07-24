'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAccessToken, setAccessToken } from '@/lib/auth';
import { lengthBetween } from '@/lib/validators';
import FormAlert from '@/components/FormAlert/FormAlert';
import FormField from '@/components/FormField/FormField';
import ProfileAvatar from '@/components/ProfileAvatar/ProfileAvatar';
import styles from './profile.module.css';

export default function ProfilePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const token = getAccessToken();
      if (!token) {
        router.replace('/auth');
        return;
      }
      try {
        const data = await apiFetch('/api/auth/me', { token });
        setProfile(data.profile);
        setName(data.profile.name || '');
        setCity(data.profile.city || '');
        setPincode(data.profile.pincode || '');
        setReady(true);
      } catch {
        router.replace('/auth');
      }
    }
    load();
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setFieldErrors({});

    const nameCheck = lengthBetween(name, { min: 2, max: 80, label: 'Name' });
    const errors = {};
    if (!nameCheck.ok) errors.name = nameCheck.message;
    if (city.trim().length < 2) errors.city = 'City is required';
    if (!/^\d{6}$/.test(pincode)) errors.pincode = 'Pincode must be 6 digits';
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const token = getAccessToken();
      const data = await apiFetch('/api/auth/profile', {
        method: 'PATCH',
        token,
        body: {
          name: nameCheck.value,
          city: city.trim(),
          pincode,
        },
      });
      if (data.accessToken) setAccessToken(data.accessToken);
      setProfile(data.profile);
      setMessage('Profile updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <div className={`container ${styles.page}`}>
        <p>Loading…</p>
      </div>
    );
  }

  const rep = profile?.reputation_score;
  const count = profile?.rating_count || 0;
  const showRep = count >= 10 && rep != null;

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.header}>
        <ProfileAvatar profile={profile} size="lg" />
        <div>
          <h1 className="pageTitle">{profile.name || 'Profile'}</h1>
          <p className={styles.meta}>
            {profile.verified_at
              ? `Discord @${profile.discord_username}`
              : 'Discord not verified'}
          </p>
          <p className={styles.meta}>
            Reputation:{' '}
            {showRep ? `${rep} (${count} ratings)` : 'Not enough ratings yet'}
          </p>
          {!profile.verified_at && (
            <Link href="/onboarding" className="btn btnSecondary">
              Verify Discord
            </Link>
          )}
        </div>
      </div>

      <FormAlert type="error">{error}</FormAlert>
      <FormAlert type="success">{message}</FormAlert>

      <form className={`card ${styles.form}`} onSubmit={handleSubmit} noValidate>
        <FormField id="name" label="Display name" required error={fieldErrors.name}>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>
        <FormField id="city" label="City" required error={fieldErrors.city}>
          <input className="input" value={city} onChange={(e) => setCity(e.target.value)} />
        </FormField>
        <FormField id="pincode" label="Pincode" required error={fieldErrors.pincode}>
          <input
            className="input"
            value={pincode}
            onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
          />
        </FormField>
        <FormField id="email" label="Email" hint="Entry field only — not verified">
          <input className="input" value={profile.email || ''} disabled />
        </FormField>
        <button type="submit" className="btn btnPrimary" disabled={loading}>
          {loading ? 'Saving…' : 'Save profile'}
        </button>
      </form>
    </div>
  );
}
