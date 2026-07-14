'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchCities } from '@/lib/cities';

const CitiesContext = createContext({
  cities: [],
  loading: true,
  error: '',
  getCityById: () => null,
});

export function CitiesProvider({ children }) {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await fetchCities();
        if (!cancelled) setCities(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) {
          setCities([]);
          setError(err.message || 'Failed to load cities');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const getCityById = useCallback(
    (id) => cities.find((c) => c.id === String(id)) || null,
    [cities]
  );

  const value = useMemo(
    () => ({ cities, loading, error, getCityById }),
    [cities, loading, error, getCityById]
  );

  return <CitiesContext.Provider value={value}>{children}</CitiesContext.Provider>;
}

export function useCities() {
  return useContext(CitiesContext);
}
