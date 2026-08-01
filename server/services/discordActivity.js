/**
 * Discord activity feed — signup, event create/join, refunds.
 * Fire-and-forget; never block API responses on Discord latency.
 */
const { supabase } = require('../config/supabase');
const { HOST_CREATE_FEE, JOIN_FEE } = require('../config/community');

const COLORS = {
  signup: 0x57f287,
  eventCreated: 0x5865f2,
  eventJoined: 0x9b59b6,
  refund: 0xfaa61a,
};

const REFUND_REASON_LABELS = {
  host_cancelled: 'Host cancelled event (full ₹50)',
  joiner_cancelled: 'Joiner left (50% ₹25)',
  event_full: 'Event full — auto refund (full ₹50)',
};

const REFUND_TRIGGERED_BY = {
  host_cancelled: 'Host',
  joiner_cancelled: 'Joiner',
  event_full: 'System',
};

/** One Discord channel webhook per activity type. */
const WEBHOOK_ENV = {
  signup: 'DISCORD_SIGNUP_WEBHOOK_URL',
  eventCreated: 'DISCORD_EVENT_CREATED_WEBHOOK_URL',
  eventJoined: 'DISCORD_EVENT_JOINED_WEBHOOK_URL',
  refund: 'DISCORD_REFUND_WEBHOOK_URL',
};

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}

function formatWhen(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return String(iso);
  }
}

function field(name, value, inline = true) {
  const text = value == null || value === '' ? '—' : String(value);
  return { name, value: text.slice(0, 1024), inline };
}

function buildSignupEmbed(profile) {
  const base = appUrl();
  return {
    title: 'New signup',
    color: COLORS.signup,
    timestamp: new Date().toISOString(),
    fields: [
      field('Name', profile.name),
      field('Email', profile.email),
      field('User ID', profile.id),
      field('Onboarding', profile.onboarding_complete ? 'Complete' : 'Pending'),
      field('Profile', `[View profile](${base}/u/${profile.id})`, false),
    ],
  };
}

function buildEventCreatedEmbed({ event, host, payment }) {
  const base = appUrl();
  return {
    title: 'Event published',
    color: COLORS.eventCreated,
    timestamp: new Date().toISOString(),
    fields: [
      field('Title', event.title, false),
      field('City', event.city),
      field('Starts', formatWhen(event.start_at)),
      field('Duration', `${event.duration_minutes} min`),
      field('Max spots', event.max_spots),
      field('Host', host?.name || '—'),
      field('Host email', host?.email || '—'),
      field('Create fee', `₹${payment?.amount ?? HOST_CREATE_FEE}`),
      field('Payment ID', payment?.razorpay_payment_id || '—'),
      field('Event', `[View event](${base}/events/${event.id})`, false),
    ],
  };
}

function buildEventJoinedEmbed({ event, joiner, host, payment, memberCount, spotsRemaining }) {
  const base = appUrl();
  return {
    title: 'New joiner',
    color: COLORS.eventJoined,
    timestamp: new Date().toISOString(),
    fields: [
      field('Event', `[${event.title}](${base}/events/${event.id})`, false),
      field('City', event.city),
      field('Joiner', joiner?.name || '—'),
      field('Joiner email', joiner?.email || '—'),
      field('Joiner city', joiner?.city || '—'),
      field('Host', host?.name || '—'),
      field('Join fee', `₹${payment?.amount ?? JOIN_FEE}`),
      field('Members', memberCount != null ? String(memberCount) : '—'),
      field('Spots left', spotsRemaining != null ? String(spotsRemaining) : '—'),
      field('Payment ID', payment?.razorpay_payment_id || '—'),
    ],
  };
}

function buildRefundEmbed({ event, user, payment, reason, refundAmount, triggeredBy }) {
  const base = appUrl();
  const reasonLabel = REFUND_REASON_LABELS[reason] || reason || '—';
  const actor = triggeredBy || REFUND_TRIGGERED_BY[reason] || '—';
  return {
    title: 'Refund initiated',
    color: COLORS.refund,
    timestamp: new Date().toISOString(),
    fields: [
      field('Reason', reasonLabel, false),
      field('Amount', refundAmount != null ? `₹${refundAmount}` : '—'),
      field('Triggered by', actor),
      field('Refundee', user?.name || '—'),
      field('Refundee email', user?.email || '—'),
      field(
        'Event',
        event?.id ? `[${event.title || 'Event'}](${base}/events/${event.id})` : '—',
        false
      ),
      field('Payment ID', payment?.razorpay_payment_id || '—'),
    ],
  };
}

async function postActivity({ channel, content, embeds }) {
  const envKey = WEBHOOK_ENV[channel];
  if (!envKey) {
    throw new Error(`Unknown discord activity channel: ${channel}`);
  }

  const webhookUrl = process.env[envKey];
  const payload = {};
  if (content) payload.content = content;
  if (embeds?.length) payload.embeds = embeds;

  if (!webhookUrl) {
    const preview = embeds?.[0]?.title || content || channel;
    console.log(`[discord-activity:${channel}] (mock)`, preview, JSON.stringify(payload, null, 2));
    return { mock: true, channel };
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Discord webhook failed (${channel}, ${response.status}): ${text}`);
  }

  return { ok: true, channel };
}

async function notifySignup(profile) {
  await postActivity({ channel: 'signup', embeds: [buildSignupEmbed(profile)] });
}

async function notifyEventCreated({ event, host, payment }) {
  let hostProfile = host;
  if (hostProfile && !hostProfile.email && hostProfile.id) {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, email, city')
      .eq('id', hostProfile.id)
      .maybeSingle();
    hostProfile = data || hostProfile;
  }
  await postActivity({
    channel: 'eventCreated',
    embeds: [buildEventCreatedEmbed({ event, host: hostProfile, payment })],
  });
}

async function notifyEventJoined({ event, userId, host, payment, memberCount, spotsRemaining }) {
  const { data: joiner } = await supabase
    .from('profiles')
    .select('id, name, email, city')
    .eq('id', userId)
    .maybeSingle();

  await postActivity({
    channel: 'eventJoined',
    embeds: [
      buildEventJoinedEmbed({
        event,
        joiner,
        host,
        payment,
        memberCount,
        spotsRemaining,
      }),
    ],
  });
}

async function notifyRefundInitiated({
  event,
  user,
  payment,
  reason,
  refundAmount,
  triggeredBy,
}) {
  let refundee = user;
  if (refundee?.id && !refundee.email) {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('id', refundee.id)
      .maybeSingle();
    refundee = data || refundee;
  }
  await postActivity({
    channel: 'refund',
    embeds: [
      buildRefundEmbed({
        event,
        user: refundee,
        payment,
        reason,
        refundAmount,
        triggeredBy,
      }),
    ],
  });
}

module.exports = {
  appUrl,
  REFUND_REASON_LABELS,
  WEBHOOK_ENV,
  buildSignupEmbed,
  buildEventCreatedEmbed,
  buildEventJoinedEmbed,
  buildRefundEmbed,
  postActivity,
  notifySignup,
  notifyEventCreated,
  notifyEventJoined,
  notifyRefundInitiated,
};
