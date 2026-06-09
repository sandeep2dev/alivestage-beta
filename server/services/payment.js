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

function splitAmount(totalAmountInr, commissionRate) {
  const total = Number(totalAmountInr);
  const rate = Number(commissionRate) / 100;
  const platformCommission = Math.round(total * rate * 100) / 100;
  const artistPayout = Math.round((total - platformCommission) * 100) / 100;
  return { platformCommission, artistPayout };
}

async function createOrder({ amount, receipt, notes, artistLinkedAccountId, artistShare }) {
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

  const options = {
    amount: amountToPaise(amount),
    currency: 'INR',
    receipt,
    notes,
  };

  if (artistLinkedAccountId && artistShare > 0) {
    options.transfers = [{
      account: artistLinkedAccountId,
      amount: amountToPaise(artistShare),
      currency: 'INR',
      on_hold: true,
      notes,
    }];
  }

  const order = await rp.orders.create(options);
  return { mock: false, order };
}

function verifyPaymentSignature(orderId, paymentId, signature) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return true;
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

async function releaseTransfer(transferId) {
  const rp = getClient();
  if (!rp || !transferId) {
    return { skipped: true };
  }
  return rp.transfers.edit(transferId, { on_hold: false });
}

module.exports = {
  getClient,
  amountToPaise,
  splitAmount,
  createOrder,
  verifyPaymentSignature,
  refundPayment,
  releaseTransfer,
};
