export function trimRequired(value, label = 'This field') {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return { ok: false, value: '', message: `${label} is required` };
  return { ok: true, value: trimmed };
}

export function isEmail(value) {
  const trimmed = String(value ?? '').trim().toLowerCase();
  if (!trimmed) return { ok: false, value: '', message: 'Email is required' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { ok: false, value: trimmed, message: 'Enter a valid email address' };
  }
  return { ok: true, value: trimmed };
}

export function isOtp(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length !== 6) {
    return { ok: false, value: digits, message: 'Enter the 6-digit code' };
  }
  return { ok: true, value: digits };
}

export function isFutureDateTime(value, { minHoursAhead = 1 } = {}) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return { ok: false, value: '', message: 'Date and time are required' };
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, value: trimmed, message: 'Enter a valid date and time' };
  }
  const min = new Date(Date.now() + minHoursAhead * 60 * 60 * 1000);
  if (date < min) {
    return {
      ok: false,
      value: trimmed,
      message: `Choose a time at least ${minHoursAhead} hour${minHoursAhead === 1 ? '' : 's'} from now`,
    };
  }
  return { ok: true, value: trimmed, date };
}

export function lengthBetween(value, { min, max, label = 'This field' }) {
  const trimmed = String(value ?? '').trim();
  if (trimmed.length < min) {
    return { ok: false, value: trimmed, message: `${label} must be at least ${min} characters` };
  }
  if (trimmed.length > max) {
    return { ok: false, value: trimmed, message: `${label} must be at most ${max} characters` };
  }
  return { ok: true, value: trimmed };
}

/** datetime-local min value ~1 hour from now */
export { minDateTimeLocal } from '@/lib/datetime';
