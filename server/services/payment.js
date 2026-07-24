const Razorpay = require('razorpay');
const crypto = require('crypto');

function getClient() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) return null;
  return new Razorpay({ key_id, key_secret });
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
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    // Dev/mock mode without Razorpay secrets
    return Boolean(orderId && paymentId);
  }
  const body = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return expected === signature;
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
  return process.env.RAZORPAY_KEY_ID || 'mock_key';
}

module.exports = {
  getClient,
  amountToPaise,
  createOrder,
  verifyPaymentSignature,
  refundPayment,
  publicKey,
};
