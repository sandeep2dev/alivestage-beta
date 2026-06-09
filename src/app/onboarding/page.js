'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import styles from './onboarding.module.css';

const GENRES = ['Rock', 'Pop', 'Jazz', 'Classical', 'Hip Hop', 'Electronic', 'Folk', 'Bollywood'];

export default function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState(null);
  const [form, setForm] = useState({
    bio: '',
    city: '',
    avatarUrl: '',
    genres: [],
    youtubeLinks: [''],
    minBookingAmount: '',
    hourlyRate: '',
  });

  useEffect(() => {
    async function check() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }
      setUserId(user.id);
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profile?.role !== 'artist') {
        router.push('/');
      }
    }
    check();
  }, [router]);

  function toggleGenre(genre) {
    setForm((prev) => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter((g) => g !== genre)
        : [...prev.genres, genre],
    }));
  }

  function updateYoutubeLink(index, value) {
    const links = [...form.youtubeLinks];
    links[index] = value;
    setForm({ ...form, youtubeLinks: links });
  }

  function addYoutubeLink() {
    setForm({ ...form, youtubeLinks: [...form.youtubeLinks, ''] });
  }

  async function uploadAvatar(file) {
    const supabase = createClient();
    const ext = file.name.split('.').pop();
    const path = `${userId}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  }

  async function saveStep1(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const supabase = createClient();
      let avatarUrl = form.avatarUrl;
      const fileInput = document.getElementById('avatar');
      if (fileInput?.files?.[0]) {
        avatarUrl = await uploadAvatar(fileInput.files[0]);
      }
      await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', userId);
      await supabase.from('artist_details').upsert({
        id: userId,
        bio: form.bio,
        city: form.city,
        updated_at: new Date().toISOString(),
      });
      setForm((prev) => ({ ...prev, avatarUrl }));
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
    try {
      const supabase = createClient();
      const links = form.youtubeLinks.filter((l) => l.trim());
      await supabase.from('artist_details').update({
        genres: form.genres,
        youtube_links: links,
        updated_at: new Date().toISOString(),
      }).eq('id', userId);
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
    try {
      const supabase = createClient();
      await supabase.from('artist_details').update({
        min_booking_amount: Number(form.minBookingAmount) || 0,
        hourly_rate: Number(form.hourlyRate) || 0,
        is_onboarded: true,
        updated_at: new Date().toISOString(),
      }).eq('id', userId);
      router.push('/dashboard');
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
        <div className={styles.steps}>
          {[1, 2, 3].map((s) => (
            <span key={s} className={`${styles.stepDot} ${step >= s ? styles.stepActive : ''}`}>
              Step {s}
            </span>
          ))}
        </div>

        {error && <div className="alert alertError">{error}</div>}

        {step === 1 && (
          <form onSubmit={saveStep1}>
            <h1 className="pageTitle">Identity & Location</h1>
            <p className={styles.subtitle}>Tell fans about yourself</p>
            <div className="formGroup">
              <label className="label" htmlFor="bio">Bio</label>
              <textarea id="bio" className="textarea" rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} required />
            </div>
            <div className="formGroup">
              <label className="label" htmlFor="city">Base city</label>
              <input id="city" className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
            </div>
            <div className="formGroup">
              <label className="label" htmlFor="avatar">Profile photo</label>
              <input id="avatar" type="file" accept="image/*" className="input" />
            </div>
            <button type="submit" className="btn btnPrimary" disabled={loading}>Next</button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={saveStep2}>
            <h1 className="pageTitle">Portfolio</h1>
            <p className={styles.subtitle}>Genres and performance videos</p>
            <div className="formGroup">
              <span className="label">Genres</span>
              <div className={styles.genreGrid}>
                {GENRES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    className={`${styles.genreBtn} ${form.genres.includes(g) ? styles.genreSelected : ''}`}
                    onClick={() => toggleGenre(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div className="formGroup">
              <span className="label">YouTube links</span>
              {form.youtubeLinks.map((link, i) => (
                <input
                  key={i}
                  className="input"
                  style={{ marginBottom: '0.5rem' }}
                  placeholder="https://youtube.com/..."
                  value={link}
                  onChange={(e) => updateYoutubeLink(i, e.target.value)}
                />
              ))}
              <button type="button" className="btn btnSecondary" onClick={addYoutubeLink}>Add link</button>
            </div>
            <div className={styles.navBtns}>
              <button type="button" className="btn btnSecondary" onClick={() => setStep(1)}>Back</button>
              <button type="submit" className="btn btnPrimary" disabled={loading}>Next</button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={saveStep3}>
            <h1 className="pageTitle">Rates</h1>
            <p className={styles.subtitle}>Set your booking pricing</p>
            <div className="formGroup">
              <label className="label" htmlFor="minBooking">Minimum booking amount (₹)</label>
              <input id="minBooking" type="number" className="input" value={form.minBookingAmount} onChange={(e) => setForm({ ...form, minBookingAmount: e.target.value })} required min="0" />
            </div>
            <div className="formGroup">
              <label className="label" htmlFor="hourlyRate">Hourly rate (₹)</label>
              <input id="hourlyRate" type="number" className="input" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} required min="0" />
            </div>
            <div className={styles.navBtns}>
              <button type="button" className="btn btnSecondary" onClick={() => setStep(2)}>Back</button>
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
