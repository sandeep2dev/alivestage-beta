'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import FormAlert from '@/components/FormAlert/FormAlert';
import FormField from '@/components/FormField/FormField';
import { apiFetch } from '@/lib/api';
import { getAccessToken, setAccessToken, clearAccessToken } from '@/lib/auth';
import styles from './onboarding.module.css';

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    city: '',
    pincode: '',
  });

  useEffect(() => {
    async function load() {
      const token = getAccessToken();
      if (!token) {
        router.replace('/auth');
        return;
      }
      try {
        const data = await apiFetch('/api/auth/me', { token });
        const p = data.profile;
        if (p.onboarding_complete) {
          router.replace('/');
          return;
        }
        setForm({
          name: p.name || '',
          city: p.city || '',
          pincode: p.pincode || '',
        });
      } catch {
        clearAccessToken();
        router.replace('/auth');
      }
    }
    load();
  }, [router]);

  async function saveProfile(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const token = getAccessToken();
      const data = await apiFetch('/api/auth/onboarding', {
        method: 'POST',
        token,
        body: {
          name: form.name,
          city: form.city,
          pincode: form.pincode,
        },
      });
      if (data.accessToken) setAccessToken(data.accessToken);
      router.push('/');
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
        <h1 className="pageTitle">Quick setup</h1>
        <p className={styles.subtitle}>
          Add your city so we can prioritize local jams. You can host or join after this step.
        </p>

        <FormAlert type="error">{error}</FormAlert>

        <form onSubmit={saveProfile} noValidate>
          <FormField id="name" label="Display name" required>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </FormField>
          <FormField id="city" label="City" required>
            <input
              className="input"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              required
            />
          </FormField>
          <FormField id="pincode" label="Pincode" required hint="6-digit Indian pincode">
            <input
              className="input"
              value={form.pincode}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  pincode: e.target.value.replace(/\D/g, '').slice(0, 6),
                }))
              }
              inputMode="numeric"
              required
            />
          </FormField>
          <button type="submit" className="btn btnPrimary" disabled={loading}>
            {loading ? 'Saving…' : 'Continue to feed'}
          </button>
        </form>
      </div>
    </div>
  );
}
