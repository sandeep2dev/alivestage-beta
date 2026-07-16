'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAccessToken, setAccessToken } from '@/lib/auth';
import { isPhone, lengthBetween } from '@/lib/validators';
import FormAlert from '@/components/FormAlert/FormAlert';
import FormField from '@/components/FormField/FormField';
import ProfileAvatar from '@/components/ProfileAvatar/ProfileAvatar';
import styles from './profile.module.css';

export default function FanProfilePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
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
        if (data.profile?.role !== 'fan') {
          router.replace('/');
          return;
        }
        setProfile(data.profile);
        setName(data.profile.name || '');
        setPhone(data.profile.phone || '');
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
    const phoneCheck = isPhone(phone);
    const errors = {};
    if (!nameCheck.ok) errors.name = nameCheck.message;
    if (!phoneCheck.ok) errors.phone = phoneCheck.message;
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
          phone: phoneCheck.value,
        },
      });
      if (data.accessToken) setAccessToken(data.accessToken);
      setProfile(data.profile);
      setName(data.profile.name || '');
      setPhone(data.profile.phone || '');
      setMessage('Profile updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return <div className="container"><p>Loading...</p></div>;
  }

  return (
    <div className={`container ${styles.page}`}>
      <div className={`card ${styles.card}`}>
        <div className={styles.header}>
          <ProfileAvatar profile={profile} size="lg" />
          <div>
            <h1 className="pageTitle">Profile</h1>
            <p className={styles.subtitle}>Update your account details</p>
          </div>
        </div>

        <FormAlert type="error">{error}</FormAlert>
        <FormAlert type="success">{message}</FormAlert>

        <form onSubmit={handleSubmit} noValidate>
          <FormField id="email" label="Email" hint="Email cannot be changed">
            <input id="email" className="input" value={profile.email || ''} disabled readOnly />
          </FormField>

          <FormField id="name" label="Full name" required error={fieldErrors.name}>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              maxLength={80}
            />
          </FormField>

          <FormField
            id="phone"
            label="Contact number"
            error={fieldErrors.phone}
            hint="Optional. 10-digit Indian mobile number"
          >
            <input
              className="input"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </FormField>

          <button type="submit" className="btn btnPrimary" disabled={loading}>
            {loading ? 'Saving...' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
