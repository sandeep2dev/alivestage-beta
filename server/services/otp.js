const crypto = require('crypto');
const { supabase } = require('../config/supabase');

const DEFAULT_TTL_MS = 10 * 60 * 1000;
const OTP_LENGTH = 6;
const MAX_ATTEMPTS = 5;
const DEFAULT_COOLDOWN_MS = 45 * 1000;

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
 * Create or replace an OTP for a key (persisted in Supabase).
 * @param {string} key
 * @param {{ enforceCooldown?: boolean, ttlMs?: number, cooldownMs?: number }} [opts]
 */
async function createOtp(key, {
  enforceCooldown = false,
  ttlMs = DEFAULT_TTL_MS,
  cooldownMs = DEFAULT_COOLDOWN_MS,
} = {}) {
  const storeKey = normalizeKey(key);
  if (!storeKey) {
    return { ok: false, message: 'Invalid OTP key' };
  }

  if (enforceCooldown) {
    const { data: existing } = await supabase
      .from('otp_challenges')
      .select('sent_at')
      .eq('key', storeKey)
      .maybeSingle();

    if (existing?.sent_at) {
      const elapsed = Date.now() - new Date(existing.sent_at).getTime();
      if (elapsed < cooldownMs) {
        const retryAfterSec = Math.ceil((cooldownMs - elapsed) / 1000);
        return {
          ok: false,
          message: `Please wait ${retryAfterSec}s before requesting a new code`,
          retryAfterSec,
        };
      }
    }
  }

  const code = generateCode();
  const now = new Date();
  const { error } = await supabase.from('otp_challenges').upsert(
    {
      key: storeKey,
      hash: hashCode(storeKey, code),
      expires_at: new Date(now.getTime() + ttlMs).toISOString(),
      attempts: 0,
      sent_at: now.toISOString(),
    },
    { onConflict: 'key' }
  );
  if (error) throw error;

  return { ok: true, code };
}

async function verifyOtp(key, code) {
  const storeKey = normalizeKey(key);
  const { data: entry, error } = await supabase
    .from('otp_challenges')
    .select('*')
    .eq('key', storeKey)
    .maybeSingle();
  if (error) throw error;

  if (!entry) {
    return { ok: false, message: 'No OTP found. Please request a new code.' };
  }
  if (Date.now() > new Date(entry.expires_at).getTime()) {
    await supabase.from('otp_challenges').delete().eq('key', storeKey);
    return { ok: false, message: 'OTP expired. Please request a new code.' };
  }

  const attempts = Number(entry.attempts || 0) + 1;
  if (attempts > MAX_ATTEMPTS) {
    await supabase.from('otp_challenges').delete().eq('key', storeKey);
    return { ok: false, message: 'Too many attempts. Please request a new code.' };
  }

  if (entry.hash !== hashCode(storeKey, String(code || '').trim())) {
    await supabase
      .from('otp_challenges')
      .update({ attempts })
      .eq('key', storeKey);
    return { ok: false, message: 'Invalid OTP code.' };
  }

  await supabase.from('otp_challenges').delete().eq('key', storeKey);
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
