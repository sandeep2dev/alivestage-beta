'use client';

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  addMonths,
  daysInMonth,
  formatDateTimeDisplay,
  from12HourParts,
  minDateTimeLocal as defaultMin,
  monthGridStartDay,
  parseLocalDateTime,
  roundUpMinutes,
  sameDay,
  startOfDay,
  to12HourParts,
  toLocalDateTimeValue,
} from '@/lib/datetime';
import styles from './DateTimePicker.module.css';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const POPOVER_WIDTH = 260;
const POPOVER_GAP = 6;
const VIEWPORT_PAD = 12;

function parseMin(min) {
  return parseLocalDateTime(min) || parseLocalDateTime(defaultMin(1));
}

function defaultDraft(minDate) {
  const base = roundUpMinutes(minDate, 15);
  return to12HourParts(base);
}

export default function DateTimePicker({
  id,
  value = '',
  onChange,
  min,
  required = false,
  disabled = false,
  placeholder = 'Pick date and time',
  className = '',
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}) {
  const listId = useId();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const minValue = min || defaultMin(1);
  const minDate = useMemo(() => parseMin(minValue), [minValue]);

  const selected = useMemo(() => parseLocalDateTime(value), [value]);
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState({ top: 0, left: 0, above: false });
  const [placementReady, setPlacementReady] = useState(false);
  const [viewDate, setViewDate] = useState(() => selected || minDate);

  const [draftDay, setDraftDay] = useState(() => (selected ? selected.getDate() : null));
  const [draftMonth, setDraftMonth] = useState(() => (selected ? selected.getMonth() : minDate.getMonth()));
  const [draftYear, setDraftYear] = useState(() => (selected ? selected.getFullYear() : minDate.getFullYear()));
  const [draftTime, setDraftTime] = useState(() => (selected ? to12HourParts(selected) : defaultDraft(minDate)));

  useEffect(() => {
    if (!selected) return;
    setDraftDay(selected.getDate());
    setDraftMonth(selected.getMonth());
    setDraftYear(selected.getFullYear());
    setDraftTime(to12HourParts(selected));
    setViewDate(selected);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps -- sync when committed value changes

  useEffect(() => {
    if (!open) return undefined;

    function onDocPointer(e) {
      if (rootRef.current?.contains(e.target)) return;
      setOpen(false);
    }

    function onKey(e) {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener('mousedown', onDocPointer);
    document.addEventListener('touchstart', onDocPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocPointer);
      document.removeEventListener('touchstart', onDocPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const monthLabel = viewDate.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  const year = viewDate.getFullYear();
  const monthIndex = viewDate.getMonth();
  const leading = monthGridStartDay(year, monthIndex);
  const totalDays = daysInMonth(year, monthIndex);
  const cells = [];

  for (let i = 0; i < leading; i += 1) cells.push(null);
  for (let day = 1; day <= totalDays; day += 1) cells.push(day);

  useLayoutEffect(() => {
    if (!open) {
      setPlacementReady(false);
      return undefined;
    }

    function measurePlacement() {
      const trigger = triggerRef.current;
      const popover = popoverRef.current;
      if (!trigger || !popover) return;

      const triggerRect = trigger.getBoundingClientRect();
      const popoverHeight = popover.offsetHeight;
      const popoverWidth = Math.min(POPOVER_WIDTH, window.innerWidth - VIEWPORT_PAD * 2);

      const safeTop = VIEWPORT_PAD;
      const safeBottom = window.innerHeight - VIEWPORT_PAD;
      const spaceBelow = safeBottom - triggerRect.bottom - POPOVER_GAP;
      const spaceAbove = triggerRect.top - safeTop - POPOVER_GAP;

      const fitsBelow = spaceBelow >= popoverHeight;
      const fitsAbove = spaceAbove >= popoverHeight;

      let above = false;
      if (fitsBelow && fitsAbove) {
        above = false;
      } else if (fitsAbove && !fitsBelow) {
        above = true;
      } else if (!fitsAbove && fitsBelow) {
        above = false;
      } else {
        above = spaceAbove > spaceBelow;
      }

      let top = above
        ? triggerRect.top - POPOVER_GAP - popoverHeight
        : triggerRect.bottom + POPOVER_GAP;

      top = Math.max(safeTop, Math.min(top, safeBottom - popoverHeight));

      let left = triggerRect.left;
      left = Math.max(VIEWPORT_PAD, Math.min(left, window.innerWidth - popoverWidth - VIEWPORT_PAD));

      setPlacement({ top, left, above });
      setPlacementReady(true);
    }

    measurePlacement();
    window.addEventListener('resize', measurePlacement);
    window.addEventListener('scroll', measurePlacement, true);
    return () => {
      window.removeEventListener('resize', measurePlacement);
      window.removeEventListener('scroll', measurePlacement, true);
    };
  }, [open, viewDate]);

  function dayDisabled(day) {
    const date = new Date(year, monthIndex, day, 23, 59, 59, 999);
    return date < minDate;
  }

  function commitDraft(day, month, yearNum, timeParts) {
    const next = from12HourParts({
      year: yearNum,
      month,
      day,
      hour12: timeParts.hour12,
      minute: timeParts.minute,
      period: timeParts.period,
    });
    if (next < minDate) return;
    onChange?.(toLocalDateTimeValue(next));
  }

  function pickDay(day) {
    if (dayDisabled(day)) return;
    setDraftDay(day);
    setDraftMonth(monthIndex);
    setDraftYear(year);
    commitDraft(day, monthIndex, year, draftTime);
  }

  function updateTime(nextTime) {
    setDraftTime(nextTime);
    let day = draftDay;
    let month = draftMonth;
    let yearNum = draftYear;
    if (day == null) {
      for (let d = 1; d <= totalDays; d += 1) {
        if (!dayDisabled(d)) {
          day = d;
          month = monthIndex;
          yearNum = year;
          setDraftDay(day);
          setDraftMonth(month);
          setDraftYear(yearNum);
          break;
        }
      }
    }
    if (day == null) return;
    commitDraft(day, month, yearNum, nextTime);
  }

  function openPicker() {
    if (disabled) return;
    setOpen(true);
    if (!selected) {
      setViewDate(minDate);
      setDraftMonth(minDate.getMonth());
      setDraftYear(minDate.getFullYear());
      setDraftTime(defaultDraft(minDate));
    }
  }

  const display = formatDateTimeDisplay(value);
  const today = startOfDay(new Date());

  return (
    <div ref={rootRef} className={styles.root} data-datetime-picker>
      <input
        type="datetime-local"
        className={styles.hiddenNative}
        value={value}
        min={minValue}
        required={required}
        tabIndex={-1}
        aria-hidden="true"
        readOnly
        onInvalid={(e) => {
          e.preventDefault();
          triggerRef.current?.focus({ preventScroll: false });
          rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }}
      />

      <button
        ref={triggerRef}
        type="button"
        id={id}
        className={[
          'input',
          styles.trigger,
          open ? styles.triggerOpen : '',
          className,
        ].filter(Boolean).join(' ')}
        data-datetime-trigger
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        onClick={openPicker}
      >
        <span className={display ? undefined : styles.placeholder}>
          {display || placeholder}
        </span>
        <span className={styles.icon} aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </span>
      </button>

      {open && (
        <div
          ref={popoverRef}
          id={listId}
          className={[
            styles.popover,
            placementReady ? styles.popoverReady : styles.popoverMeasuring,
          ].filter(Boolean).join(' ')}
          style={{ top: placement.top, left: placement.left }}
          role="dialog"
          aria-label="Choose date and time"
        >
          <div className={styles.header}>
            <button
              type="button"
              className={styles.navBtn}
              aria-label="Previous month"
              onClick={() => setViewDate((d) => addMonths(d, -1))}
            >
              ‹
            </button>
            <span className={styles.monthLabel}>{monthLabel}</span>
            <button
              type="button"
              className={styles.navBtn}
              aria-label="Next month"
              onClick={() => setViewDate((d) => addMonths(d, 1))}
            >
              ›
            </button>
            <button
              type="button"
              className={styles.closeBtn}
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>

          <div className={styles.weekdays}>
            {WEEKDAYS.map((label) => (
              <span key={label} className={styles.weekday}>{label}</span>
            ))}
          </div>

          <div className={styles.grid}>
            {cells.map((day, idx) => {
              if (day == null) {
                return <span key={`empty-${idx}`} className={styles.dayEmpty} />;
              }

              const date = new Date(year, monthIndex, day);
              const isDisabled = dayDisabled(day);
              const isSelected = selected && sameDay(date, selected);
              const isToday = sameDay(date, today);

              return (
                <button
                  key={day}
                  type="button"
                  className={[
                    styles.dayBtn,
                    isToday ? styles.dayToday : '',
                    isSelected ? styles.daySelected : '',
                    isDisabled ? styles.dayDisabled : '',
                  ].filter(Boolean).join(' ')}
                  disabled={isDisabled}
                  aria-pressed={isSelected}
                  onClick={() => pickDay(day)}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className={styles.timeRow}>
            <select
              className={`select ${styles.timeSelect}`}
              aria-label="Hour"
              value={draftTime.hour12}
              onChange={(e) => updateTime({ ...draftTime, hour12: Number(e.target.value) })}
            >
              {HOURS_12.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <span className={styles.timeSep} aria-hidden="true">:</span>
            <select
              className={`select ${styles.timeSelect}`}
              aria-label="Minute"
              value={draftTime.minute}
              onChange={(e) => updateTime({ ...draftTime, minute: Number(e.target.value) })}
            >
              {MINUTES.map((m) => (
                <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
              ))}
            </select>
            <select
              className={`select ${styles.timeSelect} ${styles.timePeriod}`}
              aria-label="AM or PM"
              value={draftTime.period}
              onChange={(e) => updateTime({ ...draftTime, period: e.target.value })}
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
