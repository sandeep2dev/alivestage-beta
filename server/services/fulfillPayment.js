/**
 * Shared payment fulfillment for client confirm endpoints and Razorpay webhooks.
 */
const { supabase } = require('../config/supabase');
const { takeDraft, peekDraft } = require('./pendingOrders');
const { serializeEvent } = require('./eventSerializer');
const { HOST_CREATE_FEE, JOIN_FEE } = require('../config/community');
const { notifyJoinConfirmed } = require('./joinNotifications');
const { assertEventHasCapacity } = require('./eventCapacity');
const { refundPayment } = require('./payment');
const {
  notifyEventCreated,
  notifyEventJoined,
  notifyRefundInitiated,
} = require('./discordActivity');

async function findExistingPayment(orderId) {
  const { data } = await supabase
    .from('payments')
    .select('*')
    .eq('razorpay_order_id', orderId)
    .maybeSingle();
  return data;
}

async function loadHost(hostId) {
  const { data } = await supabase
    .from('profiles')
    .select('id, name, city, avatar_url, reputation_score, rating_count')
    .eq('id', hostId)
    .maybeSingle();
  return data;
}

/**
 * Fulfill a host_create draft after payment verification.
 * Idempotent if payment row already exists for the order.
 */
async function fulfillHostCreate({ orderId, paymentId, expectedUserId = null }) {
  const existing = await findExistingPayment(orderId);
  if (existing?.event_id) {
    const { data: event } = await supabase
      .from('events')
      .select('*')
      .eq('id', existing.event_id)
      .maybeSingle();
    if (event) {
      const host = await loadHost(event.host_id);
      return {
        alreadyFulfilled: true,
        event: serializeEvent(event, {
          viewerId: event.host_id,
          isMember: true,
          hostProfile: host,
        }),
      };
    }
  }

  const draft = await peekDraft(orderId);
  if (!draft || draft.kind !== 'host_create') {
    return { ok: false, message: 'No pending create order found' };
  }
  if (expectedUserId && draft.userId !== expectedUserId) {
    return { ok: false, message: 'No pending create order found' };
  }

  await takeDraft(orderId);

  const draftEvent = draft.event || {};
  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert({
      host_id: draft.userId,
      title: draftEvent.title,
      summary: draftEvent.summary,
      description: draftEvent.description ?? '',
      city: draftEvent.city,
      precise_address: draftEvent.precise_address,
      venue_lat: draftEvent.venue_lat ?? null,
      venue_lng: draftEvent.venue_lng ?? null,
      start_at: draftEvent.start_at,
      duration_minutes: draftEvent.duration_minutes,
      end_at: draftEvent.end_at,
      max_spots: draftEvent.max_spots,
      visibility: 'public',
      status: 'created',
    })
    .select('*')
    .single();
  if (eventError) throw eventError;

  const { error: payError } = await supabase.from('payments').insert({
    user_id: draft.userId,
    event_id: event.id,
    type: 'host_create_fee',
    status: 'paid',
    amount: draft.amount || HOST_CREATE_FEE,
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
  });
  if (payError) throw payError;

  const host = await loadHost(draft.userId);
  const payment = {
    amount: draft.amount || HOST_CREATE_FEE,
    razorpay_payment_id: paymentId,
  };
  notifyEventCreated({ event, host, payment }).catch((err) => {
    console.error('[fulfillHostCreate] discord notify failed', err);
  });

  return {
    ok: true,
    event: serializeEvent(event, {
      viewerId: draft.userId,
      isMember: true,
      hostProfile: host,
      memberCount: 0,
    }),
  };
}

/**
 * Fulfill a join draft after payment verification.
 */
async function fulfillJoin({ orderId, paymentId, expectedUserId = null, expectedEventId = null }) {
  const existing = await findExistingPayment(orderId);
  if (existing?.event_id && existing.type === 'join_fee') {
    const { data: event } = await supabase
      .from('events')
      .select('*')
      .eq('id', existing.event_id)
      .maybeSingle();
    const { data: membership } = await supabase
      .from('event_memberships')
      .select('*')
      .eq('event_id', existing.event_id)
      .eq('user_id', existing.user_id)
      .is('cancelled_at', null)
      .maybeSingle();
    if (event) {
      const host = await loadHost(event.host_id);
      return {
        alreadyFulfilled: true,
        event: serializeEvent(event, {
          viewerId: existing.user_id,
          isMember: true,
          hostProfile: host,
        }),
        membership,
      };
    }
  }

  const draft = await peekDraft(orderId);
  if (!draft || draft.kind !== 'join') {
    return { ok: false, message: 'No pending join order found' };
  }
  if (expectedUserId && draft.userId !== expectedUserId) {
    return { ok: false, message: 'No pending join order found' };
  }
  if (expectedEventId && draft.eventId !== expectedEventId) {
    return { ok: false, message: 'No pending join order found' };
  }

  const eventId = draft.eventId;
  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .maybeSingle();
  if (error) throw error;
  if (!event || !['created', 'live'].includes(event.status)) {
    return { ok: false, message: 'Event is not open for joining' };
  }

  const capacityCheck = await assertEventHasCapacity(event);
  if (!capacityCheck.ok) {
    return capacityCheck;
  }

  await takeDraft(orderId);

  const { data: payment, error: payError } = await supabase
    .from('payments')
    .insert({
      user_id: draft.userId,
      event_id: eventId,
      type: 'join_fee',
      status: 'paid',
      amount: draft.amount || JOIN_FEE,
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
    })
    .select('*')
    .single();
  if (payError) throw payError;

  const finalCapacity = await assertEventHasCapacity(event);
  if (!finalCapacity.ok) {
    if (payment.razorpay_payment_id) {
      await refundPayment(payment.razorpay_payment_id, JOIN_FEE);
    }
    await supabase
      .from('payments')
      .update({
        status: 'refunded_full',
        refund_amount: JOIN_FEE,
        refund_reason: 'event_full',
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id);
    notifyRefundInitiated({
      event,
      user: { id: draft.userId },
      payment,
      reason: 'event_full',
      refundAmount: JOIN_FEE,
    }).catch((err) => {
      console.error('[fulfillJoin] discord refund notify failed', err);
    });
    return finalCapacity;
  }

  const { data: membership, error: memError } = await supabase
    .from('event_memberships')
    .upsert(
      {
        event_id: eventId,
        user_id: draft.userId,
        payment_id: payment.id,
        joined_at: new Date().toISOString(),
        cancelled_at: null,
        host_marked_attended: false,
        self_marked_present: false,
      },
      { onConflict: 'event_id,user_id' }
    )
    .select('*')
    .single();
  if (memError) throw memError;

  if (membership.cancelled_at) {
    await supabase
      .from('event_memberships')
      .update({
        cancelled_at: null,
        payment_id: payment.id,
        joined_at: new Date().toISOString(),
        host_marked_attended: false,
        self_marked_present: false,
      })
      .eq('id', membership.id);
    membership.cancelled_at = null;
  }

  const host = await loadHost(event.host_id);

  notifyJoinConfirmed({ event, userId: draft.userId, host, payment }).catch((err) => {
    console.error('[fulfillJoin] join confirmation email failed', err);
  });

  const memberCount = finalCapacity.memberCount + 1;
  const spotsRemaining = Math.max(0, Number(event.max_spots) - memberCount);
  notifyEventJoined({
    event,
    userId: draft.userId,
    host,
    payment,
    memberCount,
    spotsRemaining,
  }).catch((err) => {
    console.error('[fulfillJoin] discord notify failed', err);
  });

  return {
    ok: true,
    event: serializeEvent(event, {
      viewerId: draft.userId,
      isMember: true,
      hostProfile: host,
      memberCount,
    }),
    membership,
  };
}

/**
 * Fulfill from a verified Razorpay payment (webhook or confirm).
 */
async function fulfillByOrder({ orderId, paymentId }) {
  const draft = await peekDraft(orderId);
  if (!draft) {
    const existing = await findExistingPayment(orderId);
    if (existing) return { alreadyFulfilled: true };
    return { ok: false, message: 'No pending order found' };
  }

  if (draft.kind === 'host_create') {
    return fulfillHostCreate({ orderId, paymentId });
  }
  if (draft.kind === 'join') {
    return fulfillJoin({ orderId, paymentId });
  }
  return { ok: false, message: 'Unknown draft kind' };
}

module.exports = {
  fulfillHostCreate,
  fulfillJoin,
  fulfillByOrder,
  findExistingPayment,
};
