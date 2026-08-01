const pad = (n) => String(n).padStart(2, '0');

/** Parse a datetime-local value (YYYY-MM-DDTHH:mm) in local time. */
export function parseLocalDateTime(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return null;
  const [datePart, timePart] = trimmed.split('T');
  if (!datePart || !timePart) return null;
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh, mm] = timePart.split(':').map(Number);
  if ([y, m, d, hh, mm].some((n) => Number.isNaN(n))) return null;
  const date = new Date(y, m - 1, d, hh, mm, 0, 0);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

/** Format a Date as datetime-local value (YYYY-MM-DDTHH:mm). */
export function toLocalDateTimeValue(date) {
  if (!date || Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** ISO string → datetime-local value in local time. */
export function isoToLocalDateTimeValue(iso) {
  if (!iso) return '';
  return toLocalDateTimeValue(new Date(iso));
}

/** Human-readable label for the picker trigger. */
export function formatDateTimeDisplay(value) {
  const date = parseLocalDateTime(value);
  if (!date) return '';
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** datetime-local min value N hours from now. */
export function minDateTimeLocal(hoursAhead = 1) {
  return toLocalDateTimeValue(new Date(Date.now() + hoursAhead * 60 * 60 * 1000));
}

export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
  );
}

export function addMonths(date, count) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

export function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/** First weekday column (0 = Sun) for a month grid. */
export function monthGridStartDay(year, monthIndex) {
  return new Date(year, monthIndex, 1).getDay();
}

export function roundUpMinutes(date, step = 15) {
  const d = new Date(date);
  const ms = step * 60 * 1000;
  d.setMilliseconds(0);
  d.setSeconds(0);
  const rounded = Math.ceil(d.getTime() / ms) * ms;
  return new Date(rounded);
}

export function to12HourParts(date) {
  const hours24 = date.getHours();
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hour12 = hours24 % 12 || 12;
  return { hour12, minute: date.getMinutes(), period };
}

export function from12HourParts({ year, month, day, hour12, minute, period }) {
  let hours24 = hour12 % 12;
  if (period === 'PM') hours24 += 12;
  return new Date(year, month, day, hours24, minute, 0, 0);
}
