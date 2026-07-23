'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAccessToken, setAccessToken } from '@/lib/auth';
import { imageToUploadPayload } from '@/lib/image';
import { isYoutubeUrl, lengthBetween, parseMoney } from '@/lib/validators';
import CitySelect from '@/components/CitySelect/CitySelect';
import FileUpload from '@/components/FileUpload/FileUpload';
import FormAlert from '@/components/FormAlert/FormAlert';
import FormField from '@/components/FormField/FormField';
import WhatsAppVerify from '@/components/WhatsAppVerify/WhatsAppVerify';
import styles from '../dashboard.module.css';

const GENRES = ['Rock', 'Pop', 'Jazz', 'Classical', 'Hip Hop', 'Electronic', 'Folk', 'Bollywood'];
const MAX_LINKS = 5;
const MAX_AVATAR_BYTES = 8 * 1024 * 1024;

function hasVerifiedWhatsApp(p) {
  return Boolean(p?.phone && p?.whatsapp_verified_at);
}

export default function ArtistSettingsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    bio: '',
    cityId: '',
    avatarUrl: '',
    genres: [],
    youtubeLinks: [''],
    minBookingAmount: '',
    hourlyRate: '',
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
        const d = data.artistDetails || {};
        const links = Array.isArray(d.youtube_links) && d.youtube_links.length
          ? d.youtube_links
          : [''];
        setProfile(data.profile);
        setForm({
          bio: d.bio || '',
          cityId: d.city_id || '',
          avatarUrl: data.profile?.avatar_url || '',
          genres: Array.isArray(d.genres) ? d.genres : [],
          youtubeLinks: links,
          minBookingAmount: d.min_booking_amount != null ? String(d.min_booking_amount) : '',
          hourlyRate: d.hourly_rate != null ? String(d.hourly_rate) : '',
        });
        setReady(true);
      } catch {
        router.replace('/auth');
      }
    }
    load();
  }, [router]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  function toggleGenre(genre) {
    setForm((prev) => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter((g) => g !== genre)
        : [...prev.genres, genre],
    }));
    setFieldErrors((prev) => ({ ...prev, genres: '' }));
  }

  function updateYoutubeLink(index, value) {
    const links = [...form.youtubeLinks];
    links[index] = value;
    setForm({ ...form, youtubeLinks: links });
  }

  function addYoutubeLink() {
    if (form.youtubeLinks.length >= MAX_LINKS) return;
    setForm({ ...form, youtubeLinks: [...form.youtubeLinks, ''] });
  }

  function removeYoutubeLink(index) {
    const links = form.youtubeLinks.filter((_, i) => i !== index);
    setForm({ ...form, youtubeLinks: links.length ? links : [''] });
  }

  function onAvatarChange(e) {
    const file = e.target.files?.[0];
    setFieldErrors((prev) => ({ ...prev, avatar: '' }));
    if (!file) {
      setAvatarFile(null);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setFieldErrors((prev) => ({ ...prev, avatar: 'Choose an image file' }));
      setAvatarFile(null);
      e.target.value = '';
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setFieldErrors((prev) => ({ ...prev, avatar: 'Image must be under 8 MB' }));
      setAvatarFile(null);
      e.target.value = '';
      return;
    }
    setAvatarFile(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    setFieldErrors({});

    const bioCheck = lengthBetween(form.bio, { min: 20, max: 1000, label: 'Bio' });
    const minCheck = parseMoney(form.minBookingAmount, { label: 'Minimum booking', min: 1, integer: true });
    const rateCheck = parseMoney(form.hourlyRate, { label: 'Hourly rate', min: 1, integer: true });
    const errors = {};

    if (!bioCheck.ok) errors.bio = bioCheck.message;
    if (!form.cityId) errors.cityId = 'Select a city';
    if (form.genres.length < 1) errors.genres = 'Select at least one genre';
    if (!minCheck.ok) errors.minBookingAmount = minCheck.message;
    if (!rateCheck.ok) errors.hourlyRate = rateCheck.message;

    const cleanedLinks = form.youtubeLinks.map((l) => String(l || '').trim()).filter(Boolean);
    for (const link of cleanedLinks) {
      if (!isYoutubeUrl(link)) {
        errors.youtubeLinks = 'Enter valid YouTube URLs';
        break;
      }
    }

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    try {
      const token = getAccessToken();
      const body = {
        bio: form.bio.trim(),
        cityId: form.cityId,
        genres: form.genres,
        youtubeLinks: cleanedLinks,
        minBookingAmount: minCheck.value,
        hourlyRate: rateCheck.value,
      };

      if (avatarFile) {
        const payload = await imageToUploadPayload(avatarFile);
        body.avatarBase64 = payload.base64;
        body.avatarFileName = payload.fileName;
      }

      const result = await apiFetch('/api/auth/artist-settings', {
        method: 'PATCH',
        token,
        body,
      });

      if (result.accessToken) setAccessToken(result.accessToken);
      if (result.profile?.avatar_url) {
        setForm((prev) => ({ ...prev, avatarUrl: result.profile.avatar_url }));
      }
      setAvatarFile(null);
      setMessage('Settings saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!ready) return <div className={styles.page}><p>Loading...</p></div>;

  const previewSrc = avatarPreview || form.avatarUrl;

  return (
    <div className={styles.page}>
      <h1 className="pageTitle">Settings</h1>
      <p className="pageSubtitle">Update your artist profile and rates</p>

      <FormAlert type="error">{error}</FormAlert>
      <FormAlert type="success">{message}</FormAlert>

      <div className={`card ${styles.wideForm}`} style={{ marginBottom: '1.25rem' }}>
        <h2 className="formSectionTitle">WhatsApp number</h2>
        <p className="formSectionHint">Must have WhatsApp. Required to receive booking requests.</p>
        {hasVerifiedWhatsApp(profile) ? (
          <p>
            Verified: <strong>{profile.phone}</strong>
            {' '}
            <button
              type="button"
              className="btn btnSecondary"
              style={{ marginLeft: '0.75rem' }}
              onClick={() => setProfile({ ...profile, whatsapp_verified_at: null })}
            >
              Change number
            </button>
          </p>
        ) : (
          <WhatsAppVerify
            initialPhone={profile?.phone || ''}
            onVerified={(p) => {
              setProfile(p);
              setMessage('WhatsApp number verified.');
            }}
            submitLabel="Verify WhatsApp"
          />
        )}
      </div>

      <form className={`card ${styles.wideForm}`} onSubmit={handleSubmit} noValidate>
        <section className="formSection">
          <h2 className="formSectionTitle">Profile</h2>
          <p className="formSectionHint">How you appear to fans on Alivestage</p>

          <div className="formGrid2">
            <div className="formSpanFull">
              <FormField label="Profile photo" error={fieldErrors.avatar} id="avatar" hint="JPG or PNG, up to 8 MB">
                {({ id, ...fieldProps }) => (
                  <FileUpload
                    id={id}
                    previewSrc={previewSrc}
                    previewAlt="Profile photo"
                    fileName={avatarFile?.name || ''}
                    onChange={onAvatarChange}
                    aria-invalid={fieldProps['aria-invalid']}
                    aria-describedby={fieldProps['aria-describedby']}
                  />
                )}
              </FormField>
            </div>

            <div className="formSpanFull">
              <FormField label="Bio" error={fieldErrors.bio} id="bio" hint="20–1000 characters" required>
                <textarea
                  className="textarea"
                  rows={5}
                  maxLength={1000}
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                />
              </FormField>
            </div>

            <FormField label="Base city" error={fieldErrors.cityId} id="city" required>
              <CitySelect
                value={form.cityId}
                onChange={(cityId) => setForm({ ...form, cityId })}
                placeholder="Select your base city"
              />
            </FormField>
          </div>
        </section>

        <section className="formSection">
          <h2 className="formSectionTitle">Portfolio</h2>
          <p className="formSectionHint">Genres and performance videos</p>

          <FormField label="Genres" error={fieldErrors.genres} required>
            <div className={styles.genreGrid}>
              {GENRES.map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`${styles.genreChip} ${form.genres.includes(g) ? styles.genreActive : ''}`}
                  onClick={() => toggleGenre(g)}
                  aria-pressed={form.genres.includes(g)}
                >
                  {g}
                </button>
              ))}
            </div>
          </FormField>

          <FormField label="YouTube links" error={fieldErrors.youtubeLinks} hint="Optional. Up to 5 valid YouTube URLs.">
            <div className={styles.linkStack}>
              {form.youtubeLinks.map((link, index) => (
                <div key={index} className={styles.linkRow}>
                  <input
                    className="input"
                    value={link}
                    placeholder="https://youtube.com/..."
                    onChange={(e) => updateYoutubeLink(index, e.target.value)}
                  />
                  {form.youtubeLinks.length > 1 && (
                    <button type="button" className="btn btnSecondary" onClick={() => removeYoutubeLink(index)}>
                      Remove
                    </button>
                  )}
                </div>
              ))}
              {form.youtubeLinks.length < MAX_LINKS && (
                <button type="button" className="btn btnSecondary" onClick={addYoutubeLink}>
                  Add link
                </button>
              )}
            </div>
          </FormField>
        </section>

        <section className="formSection">
          <h2 className="formSectionTitle">Rates</h2>
          <p className="formSectionHint">Whole rupees. Used for booking cost estimates.</p>

          <div className="formGrid2">
            <FormField label="Minimum booking (₹)" error={fieldErrors.minBookingAmount} id="min" required>
              <input
                className="input"
                inputMode="numeric"
                value={form.minBookingAmount}
                onChange={(e) => setForm({ ...form, minBookingAmount: e.target.value })}
              />
            </FormField>
            <FormField label="Hourly rate (₹)" error={fieldErrors.hourlyRate} id="rate" required>
              <input
                className="input"
                inputMode="numeric"
                value={form.hourlyRate}
                onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
              />
            </FormField>
          </div>
        </section>

        <div className="formActions">
          <button type="submit" className="btn btnPrimary" disabled={loading}>
            {loading ? 'Saving...' : 'Save settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
