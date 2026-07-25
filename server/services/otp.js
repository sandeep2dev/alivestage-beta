const crypto = require('crypto');

const DEFAULT_TTL_MS = 10 * 60 * 1000;
const OTP_LENGTH = 6;
const MAX_ATTEMPTS = 5;
const DEFAULT_COOLDOWN_MS = 45 * 1000;

/** @type {Map<string, { hash: string, expiresAt: number, attempts: number, sentAt: number }>} */
const store = new Map();

function normalizeKey(key) {
  return String(key || '').trim().toLowerCase();
}

function generateCode() {
  const max = 10 ** OTP_LENGTH;
  const num = crypto.randomInt(0, max);
  return String(num).padStart(OTP_LENGTH, '0');
}

function hashCode(key, code) {
  return crypto
    .createHash('sha256')
    .update(`${normalizeKey(key)}:${code}:${process.env.JWT_SECRET || 'otp'}`)
    .digest('hex');
}

/**
 * Create or replace an OTP for a key.
 * @param {string} key
 * @param {{ enforceCooldown?: boolean, ttlMs?: number, cooldownMs?: number }} [opts]
 */
function createOtp(key, {
  enforceCooldown = false,
  ttlMs = DEFAULT_TTL_MS,
  cooldownMs = DEFAULT_COOLDOWN_MS,
} = {}) {
  const storeKey = normalizeKey(key);
  if (!storeKey) {
    return { ok: false, message: 'Invalid OTP key' };
  }

  const existing = store.get(storeKey);
  if (enforceCooldown && existing?.sentAt) {
    const elapsed = Date.now() - existing.sentAt;
    if (elapsed < cooldownMs) {
      const retryAfterSec = Math.ceil((cooldownMs - elapsed) / 1000);
      return {
        ok: false,
        message: `Please wait ${retryAfterSec}s before requesting a new code`,
        retryAfterSec,
      };
    }
  }

  const code = generateCode();
  store.set(storeKey, {
    hash: hashCode(storeKey, code),
    expiresAt: Date.now() + ttlMs,
    attempts: 0,
    sentAt: Date.now(),
  });
  return { ok: true, code };
}

function verifyOtp(key, code) {
  const storeKey = normalizeKey(key);
  const entry = store.get(storeKey);
  if (!entry) {
    return { ok: false, message: 'No OTP found. Please request a new code.' };
  }
  if (Date.now() > entry.expiresAt) {
    store.delete(storeKey);
    return { ok: false, message: 'OTP expired. Please request a new code.' };
  }
  entry.attempts += 1;
  if (entry.attempts > MAX_ATTEMPTS) {
    store.delete(storeKey);
    return { ok: false, message: 'Too many attempts. Please request a new code.' };
  }
  if (entry.hash !== hashCode(storeKey, String(code || '').trim())) {
    return { ok: false, message: 'Invalid OTP code.' };
  }
  store.delete(storeKey);
  return { ok: true };
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

module.exports = {
  createOtp,
  verifyOtp,
  normalizeEmail,
  normalizeKey,
  OTP_TTL_MS: DEFAULT_TTL_MS,
  MAX_ATTEMPTS,
  RESEND_COOLDOWN_MS: DEFAULT_COOLDOWN_MS,
};
