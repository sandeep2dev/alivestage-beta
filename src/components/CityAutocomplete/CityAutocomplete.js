'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import styles from './CityAutocomplete.module.css';

/**
 * City text field with suggestions from GET /api/cities.
 * Free-text is still allowed (suggestions are optional).
 */
export default function CityAutocomplete({
  id,
  value,
  onChange,
  required = false,
  placeholder = 'Start typing a city',
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}) {
  const listId = useId();
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const blurTimer = useRef(null);

  useEffect(() => {
    const q = String(value || '').trim();
    if (q.length < 1) {
      setSuggestions([]);
      return undefined;
    }

    const timer = setTimeout(async () => {
      try {
        const data = await apiFetch(`/api/cities?q=${encodeURIComponent(q)}`);
        setSuggestions(data.cities || []);
      } catch {
        setSuggestions([]);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [value]);

  function pick(city) {
    onChange(city.name);
    setOpen(false);
  }

  return (
    <div className={styles.root}>
      <input
        id={id}
        className="input"
        value={value}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open && suggestions.length > 0}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 150);
        }}
      />
      {open && suggestions.length > 0 && (
        <ul id={listId} className={styles.list} role="listbox">
          {suggestions.map((city) => (
            <li key={city.id} role="option">
              <button
                type="button"
                className={styles.option}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(city)}
              >
                <span>{city.name}</span>
                {city.state ? <span className={styles.state}>{city.state}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
