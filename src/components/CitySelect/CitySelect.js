'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useCities } from '@/components/CitiesProvider/CitiesProvider';
import { formatCityLabel } from '@/lib/cities';
import styles from './CitySelect.module.css';

const TIERS = ['Tier 1', 'Tier 2', 'Tier 3'];

export default function CitySelect({
  id,
  value,
  onChange,
  required = false,
  disabled = false,
  placeholder = 'Select city',
  allowEmpty = false,
  className = '',
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}) {
  const { cities, loading, error } = useCities();
  const autoId = useId();
  const fieldId = id || autoId;
  const listId = `${fieldId}-listbox`;
  const rootRef = useRef(null);
  const searchRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);

  const selected = useMemo(
    () => cities.find((c) => c.id === value) || null,
    [cities, value]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cities;
    return cities.filter((c) => {
      const label = formatCityLabel(c).toLowerCase();
      return label.includes(q) || String(c.name || '').toLowerCase().includes(q);
    });
  }, [cities, query]);

  const flatOptions = useMemo(() => {
    const rows = [];
    for (const tier of TIERS) {
      const group = filtered.filter((c) => c.tier === tier);
      if (group.length === 0) continue;
      rows.push({ type: 'header', key: `h-${tier}`, label: tier });
      for (const city of group) {
        rows.push({ type: 'option', key: city.id, city });
      }
    }
    return rows;
  }, [filtered]);

  const optionRows = useMemo(
    () => flatOptions.filter((r) => r.type === 'option'),
    [flatOptions]
  );

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) {
        setOpen(false);
        setQuery('');
        setActiveIndex(-1);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  function openMenu() {
    if (disabled || loading) return;
    setOpen(true);
    setQuery('');
    setActiveIndex(-1);
  }

  function pick(cityId) {
    onChange(cityId);
    setOpen(false);
    setQuery('');
    setActiveIndex(-1);
  }

  function onTriggerKeyDown(e) {
    if (disabled || loading) return;
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openMenu();
    }
  }

  function onSearchKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, optionRows.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const row = optionRows[activeIndex];
      if (row) pick(row.city.id);
      return;
    }
  }

  const triggerLabel = loading
    ? 'Loading cities...'
    : selected
      ? formatCityLabel(selected)
      : placeholder;

  const rootClass = [
    styles.root,
    className,
    ariaInvalid ? styles.invalid : '',
    open ? styles.open : '',
    disabled || loading ? styles.disabled : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={rootClass} ref={rootRef}>
      {/* Hidden input so native form required / FormField id wiring still work */}
      <input
        id={fieldId}
        type="text"
        className={styles.srOnly}
        value={value || ''}
        onChange={() => {}}
        required={required}
        tabIndex={-1}
        aria-hidden="true"
        readOnly
      />

      <button
        type="button"
        className={styles.trigger}
        disabled={disabled || loading}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-invalid={ariaInvalid || undefined}
        aria-describedby={ariaDescribedBy}
        aria-busy={loading || undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onTriggerKeyDown}
      >
        <span className={selected ? styles.value : styles.placeholder}>{triggerLabel}</span>
        <span className={styles.chevron} aria-hidden="true" />
      </button>

      {open && (
        <div className={styles.panel} role="presentation">
          <div className={styles.searchWrap}>
            <input
              ref={searchRef}
              type="search"
              className={styles.search}
              placeholder="Search city…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={onSearchKeyDown}
              autoComplete="off"
            />
          </div>
          <ul id={listId} className={styles.list} role="listbox" aria-label={placeholder}>
            {optionRows.length === 0 && (
              <li className={styles.empty} role="presentation">No cities match</li>
            )}
            {flatOptions.map((row) => {
              if (row.type === 'header') {
                return (
                  <li key={row.key} className={styles.group} role="presentation">
                    {row.label}
                  </li>
                );
              }
              const optIndex = optionRows.findIndex((o) => o.key === row.key);
              const isSelected = row.city.id === value;
              const isActive = optIndex === activeIndex;
              return (
                <li
                  key={row.key}
                  role="option"
                  aria-selected={isSelected}
                  className={[
                    styles.option,
                    isSelected ? styles.optionSelected : '',
                    isActive ? styles.optionActive : '',
                  ].filter(Boolean).join(' ')}
                  onMouseEnter={() => setActiveIndex(optIndex)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(row.city.id)}
                >
                  {formatCityLabel(row.city)}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {error && <p className="fieldError" role="alert">{error}</p>}
      {!allowEmpty && required && !loading && cities.length === 0 && !error && (
        <p className="fieldError" role="alert">No cities available.</p>
      )}
    </div>
  );
}
