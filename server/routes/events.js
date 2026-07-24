const { supabase } = require('../config/supabase');
const { requireAuth, optionalAuth, requireVerified } = require('../middleware/auth');
const {
  createOrder,
  verifyPaymentSignature,
  refundPayment,
  publicKey,
} = require('../services/payment');
const { saveDraft, takeDraft, peekDraft } = require('../services/pendingOrders');
const { serializeEvent } = require('../services/eventSerializer');
const { sendMail } = require('../services/email');
const { sendDirectMessage } = require('../services/discord');
const {
  HOST_CREATE_FEE,
  JOIN_FEE,
  JOIN_CANCEL_REFUND,
  RATING_WINDOW_DAYS,
} = require('../config/community');

const router = require('express').Router();

function computeEndAt(startAt, durationMinutes) {
  return new Date(new Date(startAt).getTime() + Number(durationMinutes) * 60 * 1000);
}

function validateEventPayload(body) {
  const title = String(body?.title || '').trim();
  const summary = String(body?.summary || '').trim();
  const description = String(body?.description || '').trim();
  const city = String(body?.city || '').trim();
  const preciseAddress = String(body?.precise_address || body?.preciseAddress || '').trim();
  const startAt = body?.start_at || body?.startAt;
  const durationMinutes = Number(body?.duration_minutes ?? body?.durationMinutes);

  if (title.length < 3 || title.length > 120) {
    return { ok: false, message: 'Title must be 3–120 characters' };
  }
  if (summary.length < 10 || summary.length > 280) {
    return { ok: false, message: 'Summary must be 10–280 characters' };
  }
  if (description.length > 10000) {
    return { ok: false, message: 'Description is too long' };
  }
  if (city.length < 2) {
    return { ok: false, message: 'City is required' };
  }
  if (preciseAddress.length < 5) {
    return { ok: false, message: 'Precise address is required' };
  }
  if (!startAt || Number.isNaN(new Date(startAt).getTime())) {
    return { ok: false, message: 'Valid start time is required' };
  }
  if (!Number.isFinite(durationMinutes) || durationMinutes < 30 || durationMinutes > 24 * 60) {
    return { ok: false, message: 'Duration must be between 30 and 1440 minutes' };
  }
  if (new Date(startAt).getTime() < Date.now() - 60 * 1000) {
    return { ok: false, message: 'Start time must be in the future' };
  }

  return {
    ok: true,
    value: {
      title,
      summary,
      description,
      city,
      precise_address: preciseAddress,
      start_at: new Date(startAt).toISOString(),
      duration_minutes: durationMinutes,
      end_at: computeEndAt(startAt, durationMinutes).toISOString(),
    },
  };
}

async function loadMembership(eventId, userId) {
  if (!userId) return null;
  const { data } = await supabase
    .from('event_memberships')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .is('cancelled_at', null)
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

async function notifyJoinersCancelled(event, joiners) {
  for (const row of joiners || []) {
    const profile = row.profile || row;
    if (profile?.email) {
      await sendMail({
        to: profile.email,
        subject: `Jam cancelled: ${event.title}`,
        html: `
          <h2>Event cancelled</h2>
          <p>Hi ${profile.name || 'there'},</p>
          <p>The host cancelled <strong>${event.title}</strong> in ${event.city}.</p>
          <p>Your ₹${JOIN_FEE} join fee has been fully refunded.</p>
        `,
      });
    }
    if (profile?.discord_id) {
      await sendDirectMessage(
        profile.discord_id,
        `AliVeStage: "${event.title}" was cancelled by the host. Your ₹${JOIN_FEE} join fee has been fully refunded.`
      );
    }
  }
}

/** Home feed: created|live, city match first, then start_at asc */
router.get('/feed', optionalAuth, async (req, res) => {
  try {
    const viewerCity = String(req.profile?.city || '').trim().toLowerCase();

    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .in('status', ['created', 'live'])
      .order('start_at', { ascending: true });
    if (error) throw error;

    const hostIds = [...new Set((events || []).map((e) => e.host_id))];
    let hostsById = {};
    if (hostIds.length) {
      const { data: hosts } = await supabase
        .from('profiles')
        .select('id, name, city, avatar_url, reputation_score, rating_count')
        .in('id', hostIds);
      hostsById = Object.fromEntries((hosts || []).map((h) => [h.id, h]));
    }

    const sorted = [...(events || [])].sort((a, b) => {
      if (viewerCity) {
        const aMatch = String(a.city || '').toLowerCase() === viewerCity ? 0 : 1;
        const bMatch = String(b.city || '').toLowerCase() === viewerCity ? 0 : 1;
        if (aMatch !== bMatch) return aMatch - bMatch;
      }
      return new Date(a.start_at) - new Date(b.start_at);
    });

    const viewerId = req.profile?.id || null;
    const memberships = {};
    if (viewerId && sorted.length) {
      const { data: mems } = await supabase
        .from('event_memberships')
        .select('event_id')
        .eq('user_id', viewerId)
        .is('cancelled_at', null)
        .in(
          'event_id',
          sorted.map((e) => e.id)
        );
      for (const m of mems || []) memberships[m.event_id] = true;
    }

    res.json({
      events: sorted.map((event) =>
        serializeEvent(event, {
          viewerId,
          isMember: Boolean(memberships[event.id]),
          hostProfile: hostsById[event.host_id],
        })
      ),
    });
  } catch (err) {
    console.error('[events/feed]', err);
    res.status(500).json({ message: err.message || 'Failed to load feed' });
  }
});

router.get('/mine', requireAuth, async (req, res) => {
  try {
    const userId = req.profile.id;

    const { data: hosted, error: hostErr } = await supabase
      .from('events')
      .select('*')
      .eq('host_id', userId)
      .order('start_at', { ascending: false });
    if (hostErr) throw hostErr;

    const { data: memberships, error: memErr } = await supabase
      .from('event_memberships')
      .select('*, event:events(*)')
      .eq('user_id', userId)
      .is('cancelled_at', null)
      .order('joined_at', { ascending: false });
    if (memErr) throw memErr;

    const hostProfile = {
      id: req.profile.id,
      name: req.profile.name,
      city: req.profile.city,
      avatar_url: req.profile.avatar_url,
      reputation_score: req.profile.reputation_score,
      rating_count: req.profile.rating_count,
    };

    res.json({
      hosting: (hosted || []).map((e) =>
        serializeEvent(e, { viewerId: userId, isMember: true, hostProfile })
      ),
      joining: (memberships || [])
        .filter((m) => m.event)
        .map((m) =>
          serializeEvent(m.event, {
            viewerId: userId,
            isMember: true,
            hostProfile: null,
          })
        ),
    });
  } catch (err) {
    console.error('[events/mine]', err);
    res.status(500).json({ message: err.message || 'Failed to load your events' });
  }
});

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const viewerId = req.profile?.id || null;
    const membership = await loadMembership(event.id, viewerId);
    const host = await loadHost(event.host_id);

    let members = [];
    if (viewerId && (event.host_id === viewerId || membership)) {
      const { data } = await supabase
        .from('event_memberships')
        .select(
          'id, user_id, joined_at, host_marked_attended, self_marked_present, cancelled_at, profile:profiles!event_memberships_user_id_fkey(id, name, city, avatar_url, reputation_score, rating_count)'
        )
        .eq('event_id', event.id)
        .order('joined_at', { ascending: true });
      members = data || [];
    }

    res.json({
      event: serializeEvent(event, {
        viewerId,
        isMember: Boolean(membership),
        hostProfile: host,
      }),
      membership,
      members: members.filter((m) => !m.cancelled_at || event.host_id === viewerId),
    });
  } catch (err) {
    console.error('[events/:id]', err);
    res.status(500).json({ message: err.message || 'Failed to load event' });
  }
});

/** Create Razorpay order for host create fee; event created only after confirm. */
router.post('/create-order', requireAuth, requireVerified, async (req, res) => {
  try {
    const parsed = validateEventPayload(req.body);
    if (!parsed.ok) return res.status(400).json({ message: parsed.message });

    const { order, mock } = await createOrder({
      amount: HOST_CREATE_FEE,
      receipt: `host_${req.profile.id.slice(0, 8)}_${Date.now()}`.slice(0, 40),
      notes: { type: 'host_create_fee', user_id: req.profile.id },
    });

    saveDraft(order.id, {
      kind: 'host_create',
      userId: req.profile.id,
      amount: HOST_CREATE_FEE,
      event: parsed.value,
    });

    res.json({
      key: publicKey(),
      orderId: order.id,
      amount: order.amount,
      currency: 'INR',
      fee: HOST_CREATE_FEE,
      mock,
    });
  } catch (err) {
    console.error('[events/create-order]', err);
    res.status(500).json({ message: err.message || 'Failed to create order' });
  }
});

router.post('/confirm-create', requireAuth, requireVerified, async (req, res) => {
  try {
    const orderId = req.body?.razorpay_order_id || req.body?.orderId;
    const paymentId = req.body?.razorpay_payment_id || req.body?.paymentId || `mock_pay_${Date.now()}`;
    const signature = req.body?.razorpay_signature || req.body?.signature || '';

    const draft = peekDraft(orderId);
    if (!draft || draft.kind !== 'host_create' || draft.userId !== req.profile.id) {
      return res.status(400).json({ message: 'No pending create order found' });
    }

    if (!verifyPaymentSignature(orderId, paymentId, signature)) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    takeDraft(orderId);

    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        host_id: req.profile.id,
        ...draft.event,
        visibility: 'public',
        status: 'created',
      })
      .select('*')
      .single();
    if (eventError) throw eventError;

    const { error: payError } = await supabase.from('payments').insert({
      user_id: req.profile.id,
      event_id: event.id,
      type: 'host_create_fee',
      status: 'paid',
      amount: HOST_CREATE_FEE,
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
    });
    if (payError) throw payError;

    res.json({
      event: serializeEvent(event, {
        viewerId: req.profile.id,
        isMember: true,
        hostProfile: req.profile,
      }),
    });
  } catch (err) {
    console.error('[events/confirm-create]', err);
    res.status(500).json({ message: err.message || 'Failed to confirm event create' });
  }
});

router.post('/:id/join-order', requireAuth, requireVerified, async (req, res) => {
  try {
    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (!['created', 'live'].includes(event.status)) {
      return res.status(400).json({ message: 'Event is not open for joining' });
    }
    if (event.host_id === req.profile.id) {
      return res.status(400).json({ message: 'Hosts cannot join their own event' });
    }

    const existing = await loadMembership(event.id, req.profile.id);
    if (existing) {
      return res.status(400).json({ message: 'Already joined' });
    }

    const { order, mock } = await createOrder({
      amount: JOIN_FEE,
      receipt: `join_${event.id.slice(0, 8)}_${Date.now()}`.slice(0, 40),
      notes: {
        type: 'join_fee',
        user_id: req.profile.id,
        event_id: event.id,
      },
    });

    saveDraft(order.id, {
      kind: 'join',
      userId: req.profile.id,
      eventId: event.id,
      amount: JOIN_FEE,
    });

    res.json({
      key: publicKey(),
      orderId: order.id,
      amount: order.amount,
      currency: 'INR',
      fee: JOIN_FEE,
      mock,
    });
  } catch (err) {
    console.error('[events/join-order]', err);
    res.status(500).json({ message: err.message || 'Failed to create join order' });
  }
});

router.post('/:id/confirm-join', requireAuth, requireVerified, async (req, res) => {
  try {
    const eventId = req.params.id;
    const orderId = req.body?.razorpay_order_id || req.body?.orderId;
    const paymentId = req.body?.razorpay_payment_id || req.body?.paymentId || `mock_pay_${Date.now()}`;
    const signature = req.body?.razorpay_signature || req.body?.signature || '';

    const draft = peekDraft(orderId);
    if (
      !draft ||
      draft.kind !== 'join' ||
      draft.userId !== req.profile.id ||
      draft.eventId !== eventId
    ) {
      return res.status(400).json({ message: 'No pending join order found' });
    }

    if (!verifyPaymentSignature(orderId, paymentId, signature)) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .maybeSingle();
    if (error) throw error;
    if (!event || !['created', 'live'].includes(event.status)) {
      return res.status(400).json({ message: 'Event is not open for joining' });
    }

    takeDraft(orderId);

    const { data: payment, error: payError } = await supabase
      .from('payments')
      .insert({
        user_id: req.profile.id,
        event_id: eventId,
        type: 'join_fee',
        status: 'paid',
        amount: JOIN_FEE,
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
      })
      .select('*')
      .single();
    if (payError) throw payError;

    const { data: membership, error: memError } = await supabase
      .from('event_memberships')
      .upsert(
        {
          event_id: eventId,
          user_id: req.profile.id,
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

    // Reactivate soft-deleted row if needed — upsert may not clear cancelled_at depending on PostgREST
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
    }

    const host = await loadHost(event.host_id);
    res.json({
      event: serializeEvent(event, {
        viewerId: req.profile.id,
        isMember: true,
        hostProfile: host,
      }),
      membership,
    });
  } catch (err) {
    console.error('[events/confirm-join]', err);
    res.status(500).json({ message: err.message || 'Failed to confirm join' });
  }
});

router.post('/:id/cancel', requireAuth, requireVerified, async (req, res) => {
  try {
    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.host_id !== req.profile.id) {
      return res.status(403).json({ message: 'Only the host can cancel this event' });
    }
    if (['completed', 'cancelled'].includes(event.status)) {
      return res.status(400).json({ message: `Event is already ${event.status}` });
    }

    const { data: memberships } = await supabase
      .from('event_memberships')
      .select(
        '*, payment:payments(*), profile:profiles!event_memberships_user_id_fkey(id, email, name, discord_id)'
      )
      .eq('event_id', event.id)
      .is('cancelled_at', null);

    for (const m of memberships || []) {
      const payment = m.payment;
      if (payment?.razorpay_payment_id && payment.status === 'paid') {
        await refundPayment(payment.razorpay_payment_id, JOIN_FEE);
        await supabase
          .from('payments')
          .update({
            status: 'refunded_full',
            refund_amount: JOIN_FEE,
            refund_reason: 'host_cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', payment.id);
      }
      await supabase
        .from('event_memberships')
        .update({ cancelled_at: new Date().toISOString() })
        .eq('id', m.id);
    }

    const { data: updated, error: updErr } = await supabase
      .from('events')
      .update({ status: 'cancelled' })
      .eq('id', event.id)
      .select('*')
      .single();
    if (updErr) throw updErr;

    await notifyJoinersCancelled(updated, memberships);

    res.json({
      event: serializeEvent(updated, {
        viewerId: req.profile.id,
        isMember: true,
        hostProfile: req.profile,
      }),
    });
  } catch (err) {
    console.error('[events/cancel]', err);
    res.status(500).json({ message: err.message || 'Failed to cancel event' });
  }
});

router.post('/:id/leave', requireAuth, requireVerified, async (req, res) => {
  try {
    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (!['created', 'live'].includes(event.status)) {
      return res.status(400).json({ message: 'Cannot leave this event now' });
    }

    const membership = await loadMembership(event.id, req.profile.id);
    if (!membership) {
      return res.status(400).json({ message: 'You are not a member of this event' });
    }

    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('id', membership.payment_id)
      .maybeSingle();

    if (payment?.razorpay_payment_id && payment.status === 'paid') {
      await refundPayment(payment.razorpay_payment_id, JOIN_CANCEL_REFUND);
      await supabase
        .from('payments')
        .update({
          status: 'refunded_partial',
          refund_amount: JOIN_CANCEL_REFUND,
          refund_reason: 'joiner_cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.id);
    }

    await supabase
      .from('event_memberships')
      .update({ cancelled_at: new Date().toISOString() })
      .eq('id', membership.id);

    res.json({ ok: true, refund_amount: JOIN_CANCEL_REFUND });
  } catch (err) {
    console.error('[events/leave]', err);
    res.status(500).json({ message: err.message || 'Failed to leave event' });
  }
});

router.post('/:id/go-live', requireAuth, requireVerified, async (req, res) => {
  try {
    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.host_id !== req.profile.id) {
      return res.status(403).json({ message: 'Only the host can mark this live' });
    }
    if (event.status !== 'created') {
      return res.status(400).json({ message: `Cannot go live from status ${event.status}` });
    }

    const { data: updated, error: updErr } = await supabase
      .from('events')
      .update({ status: 'live' })
      .eq('id', event.id)
      .select('*')
      .single();
    if (updErr) throw updErr;

    res.json({
      event: serializeEvent(updated, {
        viewerId: req.profile.id,
        isMember: true,
        hostProfile: req.profile,
      }),
    });
  } catch (err) {
    console.error('[events/go-live]', err);
    res.status(500).json({ message: err.message || 'Failed to go live' });
  }
});

router.post('/:id/complete', requireAuth, requireVerified, async (req, res) => {
  try {
    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.host_id !== req.profile.id) {
      return res.status(403).json({ message: 'Only the host can complete this event' });
    }
    if (!['created', 'live'].includes(event.status)) {
      return res.status(400).json({ message: `Cannot complete from status ${event.status}` });
    }

    const completedAt = new Date();
    const windowCloses = new Date(
      completedAt.getTime() + RATING_WINDOW_DAYS * 24 * 60 * 60 * 1000
    );

    const { data: updated, error: updErr } = await supabase
      .from('events')
      .update({
        status: 'completed',
        completed_at: completedAt.toISOString(),
        rating_window_closes_at: windowCloses.toISOString(),
      })
      .eq('id', event.id)
      .select('*')
      .single();
    if (updErr) throw updErr;

    res.json({
      event: serializeEvent(updated, {
        viewerId: req.profile.id,
        isMember: true,
        hostProfile: req.profile,
      }),
    });
  } catch (err) {
    console.error('[events/complete]', err);
    res.status(500).json({ message: err.message || 'Failed to complete event' });
  }
});

/** Host marks attendance for members */
router.post('/:id/attendance', requireAuth, requireVerified, async (req, res) => {
  try {
    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.host_id !== req.profile.id) {
      return res.status(403).json({ message: 'Only the host can mark attendance' });
    }

    const updates = Array.isArray(req.body?.attendance) ? req.body.attendance : null;
    if (!updates) {
      return res.status(400).json({
        message: 'attendance array required: [{ membershipId, attended }]',
      });
    }

    for (const row of updates) {
      const membershipId = row.membershipId || row.membership_id || row.id;
      const attended = Boolean(row.attended ?? row.host_marked_attended);
      if (!membershipId) continue;
      await supabase
        .from('event_memberships')
        .update({ host_marked_attended: attended })
        .eq('id', membershipId)
        .eq('event_id', event.id)
        .is('cancelled_at', null);
    }

    const { data: members } = await supabase
      .from('event_memberships')
      .select(
        'id, user_id, joined_at, host_marked_attended, self_marked_present, cancelled_at, profile:profiles!event_memberships_user_id_fkey(id, name, city, avatar_url)'
      )
      .eq('event_id', event.id)
      .is('cancelled_at', null);

    res.json({ members: members || [] });
  } catch (err) {
    console.error('[events/attendance]', err);
    res.status(500).json({ message: err.message || 'Failed to update attendance' });
  }
});

/** Joiner self-mark present (informational only) */
router.post('/:id/present', requireAuth, requireVerified, async (req, res) => {
  try {
    const membership = await loadMembership(req.params.id, req.profile.id);
    if (!membership) {
      return res.status(400).json({ message: 'You are not a member of this event' });
    }

    const { data, error } = await supabase
      .from('event_memberships')
      .update({ self_marked_present: true })
      .eq('id', membership.id)
      .select('*')
      .single();
    if (error) throw error;

    res.json({ membership: data });
  } catch (err) {
    console.error('[events/present]', err);
    res.status(500).json({ message: err.message || 'Failed to mark present' });
  }
});

module.exports = router;
