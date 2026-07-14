'use client';

import { useEffect, useMemo, useState } from 'react';
import ArtistCard from '@/components/ArtistCard/ArtistCard';
import CitySelect from '@/components/CitySelect/CitySelect';
import FormAlert from '@/components/FormAlert/FormAlert';
import { apiFetch } from '@/lib/api';
import { minLteMax } from '@/lib/validators';
import styles from './page.module.css';

const GENRES = ['Rock', 'Pop', 'Jazz', 'Classical', 'Hip Hop', 'Electronic', 'Folk', 'Bollywood'];

export default function HomePage() {
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ cityId: '', genre: '', minRate: '', maxRate: '' });
  const [debouncedRates, setDebouncedRates] = useState({ minRate: '', maxRate: '' });

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedRates({ minRate: filters.minRate, maxRate: filters.maxRate });
    }, 300);
    return () => clearTimeout(t);
  }, [filters.minRate, filters.maxRate]);

  const rateOrder = useMemo(
    () => minLteMax(debouncedRates.minRate, debouncedRates.maxRate),
    [debouncedRates]
  );

  const hasFilters = Boolean(
    filters.cityId || filters.genre || filters.minRate || filters.maxRate
  );

  useEffect(() => {
    async function load() {
      if (!rateOrder.ok) {
        setArtists([]);
        setLoading(false);
        setError(rateOrder.message);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        if (filters.cityId) params.set('cityId', filters.cityId);
        if (filters.genre) params.set('genre', filters.genre);
        if (debouncedRates.minRate) params.set('minRate', debouncedRates.minRate);
        if (debouncedRates.maxRate) params.set('maxRate', debouncedRates.maxRate);
        const qs = params.toString();
        const data = await apiFetch(`/api/artists${qs ? `?${qs}` : ''}`);
        setArtists(data);
      } catch (err) {
        setArtists([]);
        setError(err.message || 'Failed to load artists');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [filters.cityId, filters.genre, debouncedRates, rateOrder]);

  function clearFilters() {
    setFilters({ cityId: '', genre: '', minRate: '', maxRate: '' });
    setDebouncedRates({ minRate: '', maxRate: '' });
    setError('');
  }

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.hero}>
        <h1 className="pageTitle">Discover Artists</h1>
        <p className="pageSubtitle">Find and book live performers for your next event</p>
      </header>

      <section className={styles.filters}>
        <div className={styles.filterGroup}>
          <label className="label" htmlFor="city">City</label>
          <CitySelect
            id="city"
            value={filters.cityId}
            onChange={(cityId) => setFilters({ ...filters, cityId })}
            placeholder="All cities"
            allowEmpty
          />
        </div>
        <div className={styles.filterGroup}>
          <label className="label" htmlFor="genre">Genre</label>
          <select
            id="genre"
            className="select"
            value={filters.genre}
            onChange={(e) => setFilters({ ...filters, genre: e.target.value })}
          >
            <option value="">All genres</option>
            {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label className="label" htmlFor="minRate">Min rate (₹/hr)</label>
          <input
            id="minRate"
            type="number"
            className="input"
            min={0}
            placeholder="0"
            value={filters.minRate}
            onChange={(e) => setFilters({ ...filters, minRate: e.target.value })}
          />
        </div>
        <div className={styles.filterGroup}>
          <label className="label" htmlFor="maxRate">Max rate (₹/hr)</label>
          <input
            id="maxRate"
            type="number"
            className="input"
            min={0}
            placeholder="Any"
            value={filters.maxRate}
            onChange={(e) => setFilters({ ...filters, maxRate: e.target.value })}
          />
        </div>
        {hasFilters && (
          <div className={styles.filterGroup}>
            <label className="label">&nbsp;</label>
            <button type="button" className="btn btnSecondary" onClick={clearFilters}>
              Clear filters
            </button>
          </div>
        )}
      </section>

      <FormAlert type="error">{error}</FormAlert>

      {loading ? (
        <p className={styles.empty}>Loading artists...</p>
      ) : error && artists.length === 0 ? null : artists.length === 0 ? (
        <p className={styles.empty}>No artists found. Try adjusting your filters.</p>
      ) : (
        <div className={`grid gridCols3 ${styles.grid}`}>
          {artists.map((artist) => (
            <ArtistCard key={artist.id} artist={artist} />
          ))}
        </div>
      )}
    </div>
  );
}
