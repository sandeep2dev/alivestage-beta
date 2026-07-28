'use client';

import { useEffect, useState } from 'react';
import FormAlert from '@/components/FormAlert/FormAlert';
import FormField from '@/components/FormField/FormField';
import CityAutocomplete from '@/components/CityAutocomplete/CityAutocomplete';
import { apiFetch } from '@/lib/api';
import { getAccessToken, setAccessToken } from '@/lib/auth';
import styles from './OnboardingForm.module.css';

export default function OnboardingForm({ initialProfile, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: initialProfile?.name || '',
    city: initialProfile?.city || '',
    pincode: initialProfile?.pincode || '',
  });

  useEffect(() => {
    if (initialProfile) {
      setForm({
        name: initialProfile.name || '',
        city: initialProfile.city || '',
        pincode: initialProfile.pincode || '',
      });
    }
  }, [initialProfile]);

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
      onSuccess(data.profile || { ...initialProfile, ...form, onboarding_complete: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className={styles.title}>Quick setup</h2>
      <p className={styles.subtitle}>
        Add your city so we can prioritize local jams.
      </p>

      <FormAlert type="error">{error}</FormAlert>

      <form onSubmit={saveProfile} noValidate>
        <FormField id="onboard-name" label="Display name" required>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
        </FormField>
        <FormField id="onboard-city" label="City" required>
          <CityAutocomplete
            id="onboard-city"
            value={form.city}
            onChange={(city) => setForm((f) => ({ ...f, city }))}
            required
          />
        </FormField>
        <FormField id="onboard-pincode" label="Pincode" required hint="6-digit Indian pincode">
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
          {loading ? 'Saving…' : 'Continue'}
        </button>
      </form>
    </div>
  );
}
