/**
 * Smoke tests for payment signature helpers and address ACL serializer.
 * Run: node --test server/tests/*.test.js
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

// Isolate env for payment module (localhost → test keys)
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.RAZORPAY_KEY_ID = 'rzp_test_smoke';
process.env.RAZORPAY_KEY_SECRET = 'test_secret_key';
process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_test';

const {
  verifyPaymentSignature,
  verifyWebhookSignature,
  amountToPaise,
} = require('../services/payment');
const {
  normalizeDescriptionForStorage,
  normalizeDescriptionForDisplay,
} = require('../services/richText');
const { serializeEvent } = require('../services/eventSerializer');
const { validateEventPayload } = require('../services/eventPayload');
const {
  buildSignupEmbed,
  buildEventCreatedEmbed,
  buildEventJoinedEmbed,
  buildRefundEmbed,
  postActivity,
  REFUND_REASON_LABELS,
} = require('../services/discordActivity');

describe('eventPayload venue coordinates', () => {
  it('includes venue_lat and venue_lng in validated create payload', () => {
    const startAt = new Date(Date.now() + 86400000).toISOString();
    const parsed = validateEventPayload({
      title: 'Friday Jam Night',
      summary: 'Open jam for all skill levels welcome',
      description: '',
      city: 'Udaipur',
      precise_address: 'Zostel Udaipur, Silavat Vari Road',
      venue_lat: 24.583846,
      venue_lng: 73.682966,
      start_at: startAt,
      duration_minutes: 120,
      max_spots: 12,
    });
    assert.equal(parsed.ok, true);
    assert.equal(parsed.value.max_spots, 12);
    assert.equal(parsed.value.venue_lat, 24.583846);
    assert.equal(parsed.value.venue_lng, 73.682966);
  });

  it('rejects create payload without max_spots', () => {
    const startAt = new Date(Date.now() + 86400000).toISOString();
    const parsed = validateEventPayload({
      title: 'Friday Jam Night',
      summary: 'Open jam for all skill levels welcome',
      description: '',
      city: 'Udaipur',
      precise_address: 'Zostel Udaipur, Silavat Vari Road',
      venue_lat: 24.583846,
      venue_lng: 73.682966,
      start_at: startAt,
      duration_minutes: 120,
    });
    assert.equal(parsed.ok, false);
    assert.match(parsed.message, /spots available/i);
  });

  it('rejects create payload without venue coordinates', () => {
    const startAt = new Date(Date.now() + 86400000).toISOString();
    const parsed = validateEventPayload({
      title: 'Friday Jam Night',
      summary: 'Open jam for all skill levels welcome',
      description: '',
      city: 'Udaipur',
      precise_address: 'Zostel Udaipur, Silavat Vari Road',
      start_at: startAt,
      duration_minutes: 120,
    });
    assert.equal(parsed.ok, false);
    assert.match(parsed.message, /pin on the map/i);
  });
});

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

  it('sanitizes rich event descriptions and strips unsafe markup', () => {
    const stored = normalizeDescriptionForStorage(
      '<p>Hello <strong>jam</strong></p><script>alert(1)</script><img src="https://evil.test/x.png">'
    );
    assert.equal(stored.ok, true);
    assert.match(stored.html, /<strong>jam<\/strong>/);
    assert.doesNotMatch(stored.html, /script/i);
    assert.doesNotMatch(stored.html, /evil\.test/);

    const legacy = normalizeDescriptionForDisplay('Plain text\n\nSecond paragraph');
    assert.match(legacy, /<p>Plain text<\/p>/);
    assert.match(legacy, /Second paragraph/);
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
    venue_lat: 18.5204,
    venue_lng: 73.8567,
    start_at: '2030-01-01T18:00:00.000Z',
    duration_minutes: 120,
    end_at: '2030-01-01T20:00:00.000Z',
    max_spots: 10,
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

  it('exposes capacity fields when member count is provided', () => {
    const serialized = serializeEvent(baseEvent, {
      viewerId: 'stranger',
      isMember: false,
      hostProfile,
      memberCount: 7,
    });
    assert.equal(serialized.max_spots, 10);
    assert.equal(serialized.member_count, 7);
    assert.equal(serialized.spots_remaining, 3);
    assert.equal(serialized.is_full, false);
  });

  it('marks event full when member count reaches max_spots', () => {
    const serialized = serializeEvent(baseEvent, {
      viewerId: 'stranger',
      isMember: false,
      hostProfile,
      memberCount: 10,
    });
    assert.equal(serialized.spots_remaining, 0);
    assert.equal(serialized.is_full, true);
  });

  it('hides precise_address from non-members', () => {
    const serialized = serializeEvent(baseEvent, {
      viewerId: 'stranger',
      isMember: false,
      hostProfile,
    });
    assert.equal(serialized.precise_address, undefined);
    assert.equal(serialized.venue_lat, undefined);
    assert.equal(serialized.venue_lng, undefined);
    assert.equal(serialized.city, 'Pune');
    assert.equal(serialized.is_member, false);
    assert.equal(serialized.is_host, false);
    assert.equal(serialized.display_status, 'Upcoming');
  });

  it('includes precise_address for paid members', () => {
    const serialized = serializeEvent(baseEvent, {
      viewerId: 'joiner-1',
      isMember: true,
      hostProfile,
    });
    assert.equal(serialized.precise_address, '12 MG Road, Pune');
    assert.equal(serialized.venue_lat, 18.5204);
    assert.equal(serialized.venue_lng, 73.8567);
    assert.equal(serialized.is_member, true);
    assert.equal(serialized.display_status, 'Upcoming');
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

  it('shows Live after start_at even if still created', () => {
    const started = {
      ...baseEvent,
      start_at: '2020-01-01T18:00:00.000Z',
      end_at: '2099-01-01T20:00:00.000Z',
      status: 'created',
    };
    const serialized = serializeEvent(started, {
      viewerId: 'joiner-1',
      isMember: true,
      hostProfile,
    });
    assert.equal(serialized.display_status, 'Live');
    assert.equal(serialized.has_started, true);
    assert.equal(serialized.has_ended, false);
    assert.equal(serialized.status, 'created');
  });

  it('shows Past for joiners after end_at even if still created', () => {
    const pastEvent = {
      ...baseEvent,
      start_at: '2020-01-01T18:00:00.000Z',
      end_at: '2020-01-01T20:00:00.000Z',
      status: 'created',
    };
    const asJoiner = serializeEvent(pastEvent, {
      viewerId: 'joiner-1',
      isMember: true,
      hostProfile,
    });
    assert.equal(asJoiner.display_status, 'Past');
    assert.equal(asJoiner.has_ended, true);
    assert.equal(asJoiner.status, 'created');

    const asHost = serializeEvent(pastEvent, {
      viewerId: 'host-1',
      isMember: false,
      hostProfile,
    });
    assert.equal(asHost.display_status, 'Ended');
  });

  it('returns null for missing event', () => {
    assert.equal(serializeEvent(null), null);
  });
});

describe('discordActivity embed builders', () => {
  it('builds signup embed with profile link', () => {
    const embed = buildSignupEmbed({
      id: 'user-1',
      name: 'alex',
      email: 'alex@example.com',
      onboarding_complete: false,
    });
    assert.equal(embed.title, 'New signup');
    assert.match(embed.fields.find((f) => f.name === 'Email').value, /alex@example.com/);
    assert.match(embed.fields.find((f) => f.name === 'Profile').value, /\/u\/user-1/);
    assert.match(embed.fields.find((f) => f.name === 'Onboarding').value, /Pending/);
  });

  it('builds event created embed with fee and payment id', () => {
    const embed = buildEventCreatedEmbed({
      event: {
        id: 'evt-1',
        title: 'Friday Jam',
        city: 'Pune',
        start_at: '2030-06-01T18:00:00.000Z',
        duration_minutes: 120,
        max_spots: 10,
      },
      host: { name: 'Host', email: 'host@example.com' },
      payment: { amount: 200, razorpay_payment_id: 'pay_create_1' },
    });
    assert.equal(embed.title, 'Event published');
    assert.match(embed.fields.find((f) => f.name === 'Title').value, /Friday Jam/);
    assert.match(embed.fields.find((f) => f.name === 'Create fee').value, /₹200/);
    assert.match(embed.fields.find((f) => f.name === 'Payment ID').value, /pay_create_1/);
    assert.match(embed.fields.find((f) => f.name === 'Event').value, /\/events\/evt-1/);
  });

  it('builds event joined embed with capacity fields', () => {
    const embed = buildEventJoinedEmbed({
      event: { id: 'evt-1', title: 'Friday Jam', city: 'Pune' },
      joiner: { name: 'Jamie', email: 'jamie@example.com', city: 'Mumbai' },
      host: { name: 'Host' },
      payment: { amount: 50, razorpay_payment_id: 'pay_join_1' },
      memberCount: 3,
      spotsRemaining: 7,
    });
    assert.equal(embed.title, 'New joiner');
    assert.match(embed.fields.find((f) => f.name === 'Joiner').value, /Jamie/);
    assert.match(embed.fields.find((f) => f.name === 'Members').value, /3/);
    assert.match(embed.fields.find((f) => f.name === 'Spots left').value, /7/);
  });

  it('builds refund embed with reason label', () => {
    const embed = buildRefundEmbed({
      event: { id: 'evt-1', title: 'Friday Jam' },
      user: { name: 'Jamie', email: 'jamie@example.com' },
      payment: { razorpay_payment_id: 'pay_ref_1' },
      reason: 'joiner_cancelled',
      refundAmount: 25,
      triggeredBy: 'Joiner',
    });
    assert.equal(embed.title, 'Refund initiated');
    assert.match(embed.fields.find((f) => f.name === 'Reason').value, /Joiner left/);
    assert.match(embed.fields.find((f) => f.name === 'Amount').value, /₹25/);
    assert.equal(REFUND_REASON_LABELS.host_cancelled, 'Host cancelled event (full ₹50)');
  });

  it('postActivity logs mock payload when webhook url is unset', async () => {
    const prev = process.env.DISCORD_SIGNUP_WEBHOOK_URL;
    delete process.env.DISCORD_SIGNUP_WEBHOOK_URL;
    const result = await postActivity({
      channel: 'signup',
      embeds: [buildSignupEmbed({ id: 'u1', name: 'a', email: 'a@t.com', onboarding_complete: false })],
    });
    assert.equal(result.mock, true);
    assert.equal(result.channel, 'signup');
    if (prev) process.env.DISCORD_SIGNUP_WEBHOOK_URL = prev;
  });
});
