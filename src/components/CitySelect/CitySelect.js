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
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}) {
  const { cities, loading, error } = useCities();
  const selectClass = [className, ariaInvalid ? 'inputError' : ''].filter(Boolean).join(' ');

  return (
    <>
      <select
        id={id}
        className={selectClass}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled || loading}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        aria-busy={loading || undefined}
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
      {error && <p className="fieldError" role="alert">{error}</p>}
      {!allowEmpty && required && !loading && cities.length === 0 && !error && (
        <p className="fieldError" role="alert">No cities available.</p>
      )}
    </>
  );
}
