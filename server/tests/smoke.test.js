/**
 * Smoke tests for payment signature helpers and address ACL serializer.
 * Run: node --test server/tests/*.test.js
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

// Isolate env for payment module
process.env.RAZORPAY_KEY_SECRET = 'test_secret_key';
process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_test';

const {
  verifyPaymentSignature,
  verifyWebhookSignature,
  amountToPaise,
} = require('../services/payment');
const { serializeEvent } = require('../services/eventSerializer');

describe('payment helpers', () => {
  it('converts INR to paise', () => {
    assert.equal(amountToPaise(50), 5000);
    assert.equal(amountToPaise(200), 20000);
    assert.equal(amountToPaise(25), 2500);
  });

  it('verifies checkout payment signatures', () => {
    const orderId = 'order_abc';
    const paymentId = 'pay_xyz';
    const signature = crypto
      .createHmac('sha256', 'test_secret_key')
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    assert.equal(verifyPaymentSignature(orderId, paymentId, signature), true);
    assert.equal(verifyPaymentSignature(orderId, paymentId, 'bad'), false);
  });

  it('verifies webhook signatures over raw body', () => {
    const body = Buffer.from(JSON.stringify({ event: 'payment.captured' }));
    const signature = crypto
      .createHmac('sha256', 'whsec_test')
      .update(body)
      .digest('hex');

    assert.equal(verifyWebhookSignature(body, signature), true);
    assert.equal(verifyWebhookSignature(body, 'nope'), false);
  });
});

describe('eventSerializer address ACL', () => {
  const baseEvent = {
    id: 'evt-1',
    host_id: 'host-1',
    title: 'Friday Jam',
    summary: 'Open jam night downtown',
    description: 'Bring your gear',
    city: 'Pune',
    precise_address: '12 MG Road, Pune',
    start_at: '2030-01-01T18:00:00.000Z',
    duration_minutes: 120,
    end_at: '2030-01-01T20:00:00.000Z',
    visibility: 'public',
    status: 'created',
    created_at: '2030-01-01T10:00:00.000Z',
  };

  const hostProfile = {
    id: 'host-1',
    name: 'Host',
    city: 'Pune',
    avatar_url: null,
    reputation_score: 4.5,
    rating_count: 12,
  };

  it('hides precise_address from non-members', () => {
    const serialized = serializeEvent(baseEvent, {
      viewerId: 'stranger',
      isMember: false,
      hostProfile,
    });
    assert.equal(serialized.precise_address, undefined);
    assert.equal(serialized.city, 'Pune');
    assert.equal(serialized.is_member, false);
    assert.equal(serialized.is_host, false);
  });

  it('includes precise_address for paid members', () => {
    const serialized = serializeEvent(baseEvent, {
      viewerId: 'joiner-1',
      isMember: true,
      hostProfile,
    });
    assert.equal(serialized.precise_address, '12 MG Road, Pune');
    assert.equal(serialized.is_member, true);
  });

  it('includes precise_address for the host', () => {
    const serialized = serializeEvent(baseEvent, {
      viewerId: 'host-1',
      isMember: false,
      hostProfile,
    });
    assert.equal(serialized.precise_address, '12 MG Road, Pune');
    assert.equal(serialized.is_host, true);
    assert.equal(serialized.host.reputation.enough, true);
    assert.equal(serialized.host.reputation.display, 4.5);
  });

  it('returns null for missing event', () => {
    assert.equal(serializeEvent(null), null);
  });
});
