const express = require('express');
const { verifyWebhookSignature } = require('../services/payment');
const { fulfillByOrder } = require('../services/fulfillPayment');

const router = express.Router();

/**
 * Razorpay webhook — expects raw Buffer body (mounted with express.raw).
 * Handles payment.captured to fulfill pending host_create / join drafts.
 */
router.post('/', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.body;
    const raw =
      Buffer.isBuffer(rawBody)
        ? rawBody
        : Buffer.from(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody || {}));

    if (!verifyWebhookSignature(raw, signature)) {
      return res.status(400).json({ message: 'Invalid webhook signature' });
    }

    let payload;
    try {
      payload = JSON.parse(raw.toString('utf8'));
    } catch {
      return res.status(400).json({ message: 'Invalid JSON body' });
    }

    const eventName = payload?.event;
    if (eventName === 'payment.captured' || eventName === 'payment.authorized') {
      const entity = payload?.payload?.payment?.entity;
      const orderId = entity?.order_id;
      const paymentId = entity?.id;
      if (orderId && paymentId) {
        const result = await fulfillByOrder({ orderId, paymentId });
        if (result.ok === false && !result.alreadyFulfilled) {
          console.warn('[webhooks/razorpay] Fulfill skipped:', result.message, orderId);
        } else {
          console.log('[webhooks/razorpay] Fulfilled order', orderId, result.alreadyFulfilled ? '(idempotent)' : '');
        }
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[webhooks/razorpay]', err);
    res.status(500).json({ message: err.message || 'Webhook failed' });
  }
});

module.exports = router;
