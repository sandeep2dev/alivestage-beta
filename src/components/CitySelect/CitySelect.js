'use client';

import { useCities } from '@/components/CitiesProvider/CitiesProvider';
import { formatCityLabel } from '@/lib/cities';

export default function CitySelect({
  id = 'city',
  value,
  onChange,
  required = false,
  disabled = false,
  placeholder = 'Select city',
  allowEmpty = false,
  className = 'select',
}) {
  const { cities, loading, error } = useCities();

  return (
    <>
      <select
        id={id}
        className={className}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled || loading}
      >
        <option value="">{loading ? 'Loading cities...' : placeholder}</option>
        {['Tier 1', 'Tier 2', 'Tier 3'].map((tier) => {
          const group = cities.filter((c) => c.tier === tier);
          if (group.length === 0) return null;
          return (
            <optgroup key={tier} label={tier}>
              {group.map((city) => (
                <option key={city.id} value={city.id}>
                  {formatCityLabel(city)}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
      {error && <p className="alert alertError" style={{ marginTop: '0.5rem' }}>{error}</p>}
      {!allowEmpty && required && !loading && cities.length === 0 && !error && (
        <p className="alert alertError" style={{ marginTop: '0.5rem' }}>No cities available.</p>
      )}
    </>
  );
}
