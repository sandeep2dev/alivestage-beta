const crypto = require('crypto');

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_LENGTH = 6;

/** @type {Map<string, { hash: string, expiresAt: number, attempts: number }>} */
const store = new Map();

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function generateCode() {
  const max = 10 ** OTP_LENGTH;
  const num = crypto.randomInt(0, max);
  return String(num).padStart(OTP_LENGTH, '0');
}

function hashCode(email, code) {
  return crypto
    .createHash('sha256')
    .update(`${normalizeEmail(email)}:${code}:${process.env.JWT_SECRET || 'otp'}`)
    .digest('hex');
}

function createOtp(email) {
  const key = normalizeEmail(email);
  const code = generateCode();
  store.set(key, {
    hash: hashCode(key, code),
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
  });
  return code;
}

function verifyOtp(email, code) {
  const key = normalizeEmail(email);
  const entry = store.get(key);
  if (!entry) {
    return { ok: false, message: 'No OTP found. Please request a new code.' };
  }
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return { ok: false, message: 'OTP expired. Please request a new code.' };
  }
  entry.attempts += 1;
  if (entry.attempts > 5) {
    store.delete(key);
    return { ok: false, message: 'Too many attempts. Please request a new code.' };
  }
  if (entry.hash !== hashCode(key, String(code || '').trim())) {
    return { ok: false, message: 'Invalid OTP code.' };
  }
  store.delete(key);
  return { ok: true };
}

module.exports = { createOtp, verifyOtp, normalizeEmail };
