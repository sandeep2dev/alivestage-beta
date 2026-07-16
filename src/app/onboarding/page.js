'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { imageToUploadPayload } from '@/lib/image';
import { isYoutubeUrl, lengthBetween, parseMoney } from '@/lib/validators';
import CitySelect from '@/components/CitySelect/CitySelect';
import FileUpload from '@/components/FileUpload/FileUpload';
import FormAlert from '@/components/FormAlert/FormAlert';
import FormField from '@/components/FormField/FormField';
import styles from './onboarding.module.css';

const GENRES = ['Rock', 'Pop', 'Jazz', 'Classical', 'Hip Hop', 'Electronic', 'Folk', 'Bollywood'];
const MAX_LINKS = 5;
const MAX_AVATAR_BYTES = 8 * 1024 * 1024;

export default function OnboardingWizard() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
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
    async function check() {
      const token = getAccessToken();
      if (!token) {
        router.replace('/auth');
        return;
      }
      try {
        const data = await apiFetch('/api/auth/me', { token });
        if (data.profile?.role !== 'artist') {
          router.replace('/');
          return;
        }
        setReady(true);
      } catch {
        router.replace('/auth');
      }
    }
    check();
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

  async function saveStep1(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});

    const bioCheck = lengthBetween(form.bio, { min: 20, max: 1000, label: 'Bio' });
    const errors = {};
    if (!bioCheck.ok) errors.bio = bioCheck.message;
    if (!form.cityId) errors.cityId = 'Select your base city';
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    try {
      const token = getAccessToken();
      const body = { bio: bioCheck.value, cityId: form.cityId };
      if (avatarFile) {
        const payload = await imageToUploadPayload(avatarFile);
        body.avatarBase64 = payload.base64;
        body.avatarFileName = payload.fileName;
      }
      const data = await apiFetch('/api/auth/onboarding/step1', {
        method: 'POST',
        token,
        body,
      });
      setForm((prev) => ({ ...prev, avatarUrl: data.avatarUrl || prev.avatarUrl, bio: bioCheck.value }));
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveStep2(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});

    if (form.genres.length < 1) {
      setFieldErrors({ genres: 'Select at least one genre' });
      setLoading(false);
      return;
    }

    const linkErrors = {};
    form.youtubeLinks.forEach((link, i) => {
      const check = isYoutubeUrl(link);
      if (!check.ok) linkErrors[`yt-${i}`] = check.message;
    });
    if (Object.keys(linkErrors).length) {
      setFieldErrors(linkErrors);
      setLoading(false);
      return;
    }

    try {
      const token = getAccessToken();
      await apiFetch('/api/auth/onboarding/step2', {
        method: 'POST',
        token,
        body: {
          genres: form.genres,
          youtubeLinks: form.youtubeLinks,
        },
      });
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveStep3(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});

    const minCheck = parseMoney(form.minBookingAmount, { label: 'Minimum booking', min: 1, integer: true });
    const rateCheck = parseMoney(form.hourlyRate, { label: 'Hourly rate', min: 1, integer: true });
    const errors = {};
    if (!minCheck.ok) errors.minBookingAmount = minCheck.message;
    if (!rateCheck.ok) errors.hourlyRate = rateCheck.message;
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    try {
      const token = getAccessToken();
      await apiFetch('/api/auth/onboarding/step3', {
        method: 'POST',
        token,
        body: {
          minBookingAmount: minCheck.value,
          hourlyRate: rateCheck.value,
        },
      });
      router.push('/dashboard');
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
        <div className={styles.steps} role="list" aria-label="Onboarding steps">
          {[1, 2, 3].map((s) => (
            <span
              key={s}
              role="listitem"
              aria-current={step === s ? 'step' : undefined}
              className={`${styles.stepDot} ${step >= s ? styles.stepActive : ''}`}
            >
              Step {s}
            </span>
          ))}
        </div>

        <FormAlert type="error">{error}</FormAlert>

        {step === 1 && (
          <form onSubmit={saveStep1} noValidate>
            <h1 className="pageTitle">Identity & Location</h1>
            <p className={styles.subtitle}>Tell fans about yourself</p>
            <FormField id="bio" label="Bio" required error={fieldErrors.bio} hint="20–1000 characters">
              <textarea
                className="textarea"
                rows={5}
                maxLength={1000}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
              />
            </FormField>
            <div className="formGrid2">
              <FormField id="city" label="Base city" required error={fieldErrors.cityId}>
                <CitySelect
                  id="city"
                  value={form.cityId}
                  onChange={(cityId) => {
                    setForm({ ...form, cityId });
                    setFieldErrors((prev) => ({ ...prev, cityId: '' }));
                  }}
                  required
                  placeholder="Select your base city"
                />
              </FormField>
            </div>
            <FormField id="avatar" label="Profile photo" error={fieldErrors.avatar} hint="Optional. JPG or PNG up to 8 MB.">
              {({ id, ...fieldProps }) => (
                <FileUpload
                  id={id}
                  previewSrc={avatarPreview || form.avatarUrl}
                  previewAlt="Profile preview"
                  fileName={avatarFile?.name || ''}
                  onChange={onAvatarChange}
                  aria-invalid={fieldProps['aria-invalid']}
                  aria-describedby={fieldProps['aria-describedby']}
                />
              )}
            </FormField>
            <div className="formActions">
              <button type="submit" className="btn btnPrimary" disabled={loading}>
                {loading ? 'Saving...' : 'Next'}
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={saveStep2} noValidate>
            <h1 className="pageTitle">Portfolio</h1>
            <p className={styles.subtitle}>Genres and performance videos</p>
            <div className="formGroup">
              <span className="label" id="genres-label">
                Genres <span className="requiredMark" aria-hidden="true">*</span>
              </span>
              <div className={styles.genreGrid} role="group" aria-labelledby="genres-label">
                {GENRES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    className={`${styles.genreBtn} ${form.genres.includes(g) ? styles.genreSelected : ''}`}
                    onClick={() => toggleGenre(g)}
                    aria-pressed={form.genres.includes(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
              {fieldErrors.genres && <p className="fieldError" role="alert">{fieldErrors.genres}</p>}
            </div>
            <div className="formGroup">
              <span className="label">YouTube links</span>
              <p className="fieldHint">Optional. Up to {MAX_LINKS} valid YouTube URLs.</p>
              {form.youtubeLinks.map((link, i) => (
                <div key={i} className={styles.linkRow}>
                  <FormField id={`yt-${i}`} label={i === 0 ? 'Link' : `Link ${i + 1}`} error={fieldErrors[`yt-${i}`]}>
                    <input
                      type="url"
                      className="input"
                      placeholder="https://youtube.com/..."
                      value={link}
                      onChange={(e) => updateYoutubeLink(i, e.target.value)}
                    />
                  </FormField>
                  {form.youtubeLinks.length > 1 && (
                    <button type="button" className="btn btnSecondary" onClick={() => removeYoutubeLink(i)}>
                      Remove
                    </button>
                  )}
                </div>
              ))}
              {form.youtubeLinks.length < MAX_LINKS && (
                <button type="button" className="btn btnSecondary" onClick={addYoutubeLink}>Add link</button>
              )}
            </div>
            <div className={styles.navBtns}>
              <button type="button" className="btn btnSecondary" disabled={loading} onClick={() => { setError(''); setFieldErrors({}); setStep(1); }}>Back</button>
              <button type="submit" className="btn btnPrimary" disabled={loading}>
                {loading ? 'Saving...' : 'Next'}
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={saveStep3} noValidate>
            <h1 className="pageTitle">Rates</h1>
            <p className={styles.subtitle}>Set your booking pricing in whole rupees</p>
            <div className="formGrid2">
              <FormField id="minBooking" label="Minimum booking amount (₹)" required error={fieldErrors.minBookingAmount}>
                <input
                  type="number"
                  className="input"
                  value={form.minBookingAmount}
                  onChange={(e) => setForm({ ...form, minBookingAmount: e.target.value })}
                  min={1}
                  step={1}
                />
              </FormField>
              <FormField id="hourlyRate" label="Hourly rate (₹)" required error={fieldErrors.hourlyRate}>
                <input
                  type="number"
                  className="input"
                  value={form.hourlyRate}
                  onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
                  min={1}
                  step={1}
                />
              </FormField>
            </div>
            <div className={styles.navBtns}>
              <button type="button" className="btn btnSecondary" disabled={loading} onClick={() => { setError(''); setFieldErrors({}); setStep(2); }}>Back</button>
              <button type="submit" className="btn btnPrimary" disabled={loading}>
                {loading ? 'Saving...' : 'Complete Setup'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
