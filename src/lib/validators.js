export function trimRequired(value, label = 'This field') {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return { ok: false, value: '', message: `${label} is required` };
  return { ok: true, value: trimmed };
}

export function isEmail(value) {
  const trimmed = String(value ?? '').trim().toLowerCase();
  if (!trimmed) return { ok: false, value: '', message: 'Email is required' };
  // Practical email check (not RFC-perfect)
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

export function isYoutubeUrl(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return { ok: true, value: '' };
  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, '');
    if (host === 'youtu.be' || host === 'youtube.com' || host === 'm.youtube.com') {
      return { ok: true, value: trimmed };
    }
  } catch {
    /* fall through */
  }
  return { ok: false, value: trimmed, message: 'Enter a valid YouTube URL' };
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

export function parseMoney(value, { label = 'Amount', min = 0, max = Infinity, integer = false } = {}) {
  const raw = String(value ?? '').trim();
  if (!raw) return { ok: false, value: '', message: `${label} is required` };
  const num = Number(raw);
  if (!Number.isFinite(num)) {
    return { ok: false, value: raw, message: `${label} must be a number` };
  }
  if (integer && !Number.isInteger(num)) {
    return { ok: false, value: raw, message: `${label} must be a whole number` };
  }
  if (num < min) {
    return { ok: false, value: raw, message: `${label} must be at least ${min}` };
  }
  if (num > max) {
    return { ok: false, value: raw, message: `${label} must be at most ${max}` };
  }
  return { ok: true, value: num };
}

export function minLteMax(minVal, maxVal) {
  if (minVal === '' || minVal == null || maxVal === '' || maxVal == null) {
    return { ok: true };
  }
  const min = Number(minVal);
  const max = Number(maxVal);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { ok: true };
  if (min > max) {
    return { ok: false, message: 'Min rate cannot be greater than max rate' };
  }
  return { ok: true };
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

export function isRazorpayAccountId(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return { ok: true, value: '' };
  if (!/^acc_[A-Za-z0-9]+$/.test(trimmed)) {
    return { ok: false, value: trimmed, message: 'Account ID should look like acc_xxxxxxxx' };
  }
  return { ok: true, value: trimmed };
}

/** Indian mobile with WhatsApp: optional empty, or 10 digits with optional +91 / 91 prefix */
export function isPhone(value, { required = false } = {}) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    if (required) {
      return { ok: false, value: '', message: 'WhatsApp number is required' };
    }
    return { ok: true, value: '' };
  }
  const digits = trimmed.replace(/\D/g, '');
  const local = digits.length === 12 && digits.startsWith('91')
    ? digits.slice(2)
    : digits.length === 11 && digits.startsWith('0')
      ? digits.slice(1)
      : digits;
  if (!/^[6-9]\d{9}$/.test(local)) {
    return { ok: false, value: trimmed, message: 'Enter a valid 10-digit Indian mobile number' };
  }
  return { ok: true, value: local };
}

/** datetime-local min value ~1 hour from now */
export function minDateTimeLocal(hoursAhead = 1) {
  const d = new Date(Date.now() + hoursAhead * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
