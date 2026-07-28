const Razorpay = require('razorpay');
const crypto = require('crypto');

function isLocalhostApp() {
  const raw = process.env.NEXT_PUBLIC_APP_URL || '';
  try {
    const host = new URL(raw).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return /localhost|127\.0\.0\.1/.test(String(raw));
  }
}

/**
 * Localhost → test keys only (rzp_test_*). Production → live keys when set.
 * Falls back to RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET for either mode.
 */
function resolveCredentials() {
  const local = isLocalhostApp();
  const testId = process.env.RAZORPAY_TEST_KEY_ID || null;
  const testSecret = process.env.RAZORPAY_TEST_KEY_SECRET || null;
  const liveId = process.env.RAZORPAY_LIVE_KEY_ID || null;
  const liveSecret = process.env.RAZORPAY_LIVE_KEY_SECRET || null;
  const fallbackId = process.env.RAZORPAY_KEY_ID || null;
  const fallbackSecret = process.env.RAZORPAY_KEY_SECRET || null;

  let key_id;
  let key_secret;

  if (local) {
    key_id = testId || fallbackId;
    key_secret = testSecret || fallbackSecret;
    if (key_id && !String(key_id).startsWith('rzp_test_')) {
      console.warn(
        '[razorpay] NEXT_PUBLIC_APP_URL is localhost but key is not rzp_test_* — refusing live keys; using mock mode'
      );
      return null;
    }
  } else {
    key_id = liveId || fallbackId;
    key_secret = liveSecret || fallbackSecret;
  }

  if (!key_id || !key_secret) return null;
  return { key_id, key_secret, mode: String(key_id).startsWith('rzp_test_') ? 'test' : 'live' };
}

function getClient() {
  const creds = resolveCredentials();
  if (!creds) return null;
  return new Razorpay({ key_id: creds.key_id, key_secret: creds.key_secret });
}

function amountToPaise(amountInr) {
  return Math.round(Number(amountInr) * 100);
}

async function createOrder({ amount, receipt, notes }) {
  const rp = getClient();
  if (!rp) {
    return {
      mock: true,
      order: {
        id: `mock_order_${Date.now()}`,
        amount: amountToPaise(amount),
        currency: 'INR',
      },
    };
  }

  const order = await rp.orders.create({
    amount: amountToPaise(amount),
    currency: 'INR',
    receipt,
    notes,
  });
  return { mock: false, order };
}

function verifyPaymentSignature(orderId, paymentId, signature) {
  const creds = resolveCredentials();
  if (!creds) {
    // Dev/mock mode without Razorpay secrets
    return Boolean(orderId && paymentId);
  }
  const body = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac('sha256', creds.key_secret).update(body).digest('hex');
  return expected === signature;
}

/**
 * Verify Razorpay webhook signature (HMAC-SHA256 of raw body).
 * @param {Buffer|string} rawBody
 * @param {string} signature - x-razorpay-signature header
 */
function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || resolveCredentials()?.key_secret;
  if (!secret) {
    // Dev mode: accept when no secret configured
    return Boolean(rawBody);
  }
  if (!signature) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(signature)));
  } catch {
    return false;
  }
}

async function refundPayment(paymentId, amountInr) {
  const rp = getClient();
  if (!rp || !paymentId || String(paymentId).startsWith('mock_pay_')) {
    console.warn('[razorpay] Refund skipped (no client, payment id, or mock)');
    return { skipped: true };
  }
  const refund = await rp.payments.refund(paymentId, {
    amount: amountToPaise(amountInr),
    speed: 'optimum',
  });
  return refund;
}

function publicKey() {
  return resolveCredentials()?.key_id || 'mock_key';
}

function razorpayStatus() {
  const creds = resolveCredentials();
  if (!creds) {
    return { configured: false, mode: 'mock', local: isLocalhostApp() };
  }
  return { configured: true, mode: creds.mode, local: isLocalhostApp() };
}

module.exports = {
  getClient,
  amountToPaise,
  createOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  refundPayment,
  publicKey,
  razorpayStatus,
  isLocalhostApp,
};
