/**
 * Normalize Indian mobile to 10-digit local form (no country code).
 * Accepts +91 / 91 / leading 0.
 */
function normalizeIndianPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  let local = digits;
  if (digits.length === 12 && digits.startsWith('91')) {
    local = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    local = digits.slice(1);
  }
  if (!/^[6-9]\d{9}$/.test(local)) {
    return { ok: false, value: '', message: 'Enter a valid 10-digit Indian mobile number' };
  }
  return { ok: true, value: local };
}

/** E.164 without plus for WhatsApp Cloud API (India): 91XXXXXXXXXX */
function toWhatsAppRecipient(local10) {
  return `91${local10}`;
}

module.exports = { normalizeIndianPhone, toWhatsAppRecipient };
