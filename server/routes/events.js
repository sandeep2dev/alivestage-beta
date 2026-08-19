const { supabase } = require('../config/supabase');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const {
  createOrder,
  verifyPaymentSignature,
  publicKey,
} = require('../services/payment');
const { saveDraft } = require('../services/pendingOrders');
const { fulfillHostCreate, fulfillJoin } = require('../services/fulfillPayment');
const { cancelEvent } = require('../services/cancelEvent');
const { serializeEvent } = require('../services/eventSerializer');
const { normalizeDescriptionForStorage, eventImagePath } = require('../services/richText');
const {
  HOST_CREATE_FEE,
  JOIN_FEE,
  RATING_WINDOW_DAYS,
} = require('../config/community');

const router = require('express').Router();

const { validateEventPayload } = require('../services/eventPayload');
const {
  countActiveMembers,
  countActiveMembersByEventIds,
  assertEventHasCapacity,
} = require('../services/eventCapacity');

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

/** Home feed: created|live, city match first, then start_at asc */
router.get('/feed', optionalAuth, async (req, res) => {
  try {
    const viewerCity = String(req.profile?.city || '').trim().toLowerCase();

    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .in('status', ['created', 'live'])
      .gt('end_at', new Date().toISOString())
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

    const counts = await countActiveMembersByEventIds(sorted.map((e) => e.id));

    res.json({
      events: sorted.map((event) =>
        serializeEvent(event, {
          viewerId,
          isMember: Boolean(memberships[event.id]),
          hostProfile: hostsById[event.host_id],
          memberCount: counts[event.id] ?? 0,
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

    const allEvents = [
      ...(hosted || []),
      ...(memberships || []).map((m) => m.event).filter(Boolean),
    ];
    const counts = await countActiveMembersByEventIds(allEvents.map((e) => e.id));

    res.json({
      hosting: (hosted || []).map((e) =>
        serializeEvent(e, {
          viewerId: userId,
          isMember: true,
          hostProfile,
          memberCount: counts[e.id] ?? 0,
        })
      ),
      joining: (memberships || [])
        .filter((m) => m.event)
        .map((m) =>
          serializeEvent(m.event, {
            viewerId: userId,
            isMember: true,
            hostProfile: null,
            memberCount: counts[m.event.id] ?? 0,
          })
        ),
    });
  } catch (err) {
    console.error('[events/mine]', err);
    res.status(500).json({ message: err.message || 'Failed to load your events' });
  }
});

router.get('/:id/calendar.ics', async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = String(req.query.u || '');
    const sig = String(req.query.sig || '');
    const { verifyCalendarSignature, buildEventIcs } = require('../services/calendar');

    if (!verifyCalendarSignature(eventId, userId, sig)) {
      return res.status(403).send('Invalid calendar link');
    }

    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .maybeSingle();
    if (error) throw error;
    if (!event) return res.status(404).send('Event not found');

    const { data: membership } = await supabase
      .from('event_memberships')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .is('cancelled_at', null)
      .maybeSingle();
    if (!membership && event.host_id !== userId) {
      return res.status(403).send('Not authorized');
    }

    const location = [event.precise_address, event.city].filter(Boolean).join(', ');
    const ics = buildEventIcs(event, { location });

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="alivestage-${eventId}.ics"`);
    res.send(ics);
  } catch (err) {
    console.error('[events/:id/calendar.ics]', err);
    res.status(500).send('Failed to generate calendar file');
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
    const memberCount = await countActiveMembers(event.id);

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
        memberCount,
      }),
      membership,
      members: members.filter((m) => !m.cancelled_at || event.host_id === viewerId),
    });
  } catch (err) {
    console.error('[events/:id]', err);
    res.status(500).json({ message: err.message || 'Failed to load event' });
  }
});

/** Upload inline image for event description → public Supabase URL. */
router.post('/upload-image', requireAuth, async (req, res) => {
  try {
    const base64 = String(req.body?.base64 || '');
    const contentType = String(req.body?.contentType || 'image/jpeg').toLowerCase();
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(contentType)) {
      return res.status(400).json({ message: 'Unsupported image type' });
    }

    const match = base64.match(/^data:([^;]+);base64,(.+)$/);
    const raw = match ? match[2] : base64.replace(/\s/g, '');
    if (!raw || raw.length < 32) {
      return res.status(400).json({ message: 'Image data is required' });
    }

    const buffer = Buffer.from(raw, 'base64');
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ message: 'Image must be under 5MB' });
    }

    const ext =
      contentType === 'image/png'
        ? 'png'
        : contentType === 'image/webp'
          ? 'webp'
          : contentType === 'image/gif'
            ? 'gif'
            : 'jpg';
    const path = eventImagePath(req.profile.id, ext);

    const { error: uploadError } = await supabase.storage
      .from('event-images')
      .upload(path, buffer, { contentType });
    if (uploadError) throw uploadError;

    const { data: pub } = supabase.storage.from('event-images').getPublicUrl(path);
    res.json({ url: pub.publicUrl });
  } catch (err) {
    console.error('[events/upload-image]', err);
    res.status(500).json({ message: err.message || 'Failed to upload image' });
  }
});

/** Create Razorpay order for host create fee; event created only after confirm. */
router.post('/create-order', requireAuth, async (req, res) => {
  try {
    const parsed = validateEventPayload(req.body);
    if (!parsed.ok) return res.status(400).json({ message: parsed.message });

    const { order, mock } = await createOrder({
      amount: HOST_CREATE_FEE,
      receipt: `host_${req.profile.id.slice(0, 8)}_${Date.now()}`.slice(0, 40),
      notes: { type: 'host_create_fee', user_id: req.profile.id },
    });

    await saveDraft(order.id, {
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

router.post('/confirm-create', requireAuth, async (req, res) => {
  try {
    const orderId = req.body?.razorpay_order_id || req.body?.orderId;
    const paymentId = req.body?.razorpay_payment_id || req.body?.paymentId || `mock_pay_${Date.now()}`;
    const signature = req.body?.razorpay_signature || req.body?.signature || '';

    if (!orderId) {
      return res.status(400).json({ message: 'Order id is required' });
    }

    if (!verifyPaymentSignature(orderId, paymentId, signature)) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    const result = await fulfillHostCreate({
      orderId,
      paymentId,
      expectedUserId: req.profile.id,
    });
    if (result.ok === false) {
      return res.status(400).json({ message: result.message });
    }

    res.json({ event: result.event });
  } catch (err) {
    console.error('[events/confirm-create]', err);
    res.status(500).json({ message: err.message || 'Failed to confirm event create' });
  }
});

router.post('/:id/join-order', requireAuth, async (req, res) => {
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
    if (new Date(event.end_at).getTime() < Date.now()) {
      return res.status(400).json({ message: 'This jam has already ended' });
    }
    if (event.host_id === req.profile.id) {
      return res.status(400).json({ message: 'Hosts cannot join their own event' });
    }

    const existing = await loadMembership(event.id, req.profile.id);
    if (existing) {
      return res.status(400).json({ message: 'Already joined' });
    }

    const capacityCheck = await assertEventHasCapacity(event);
    if (!capacityCheck.ok) {
      return res.status(400).json({ message: capacityCheck.message });
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

    await saveDraft(order.id, {
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

router.post('/:id/confirm-join', requireAuth, async (req, res) => {
  try {
    const eventId = req.params.id;
    const orderId = req.body?.razorpay_order_id || req.body?.orderId;
    const paymentId = req.body?.razorpay_payment_id || req.body?.paymentId || `mock_pay_${Date.now()}`;
    const signature = req.body?.razorpay_signature || req.body?.signature || '';

    if (!orderId) {
      return res.status(400).json({ message: 'Order id is required' });
    }

    if (!verifyPaymentSignature(orderId, paymentId, signature)) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    const result = await fulfillJoin({
      orderId,
      paymentId,
      expectedUserId: req.profile.id,
      expectedEventId: eventId,
    });
    if (result.ok === false) {
      return res.status(400).json({ message: result.message });
    }

    res.json({
      event: result.event,
      membership: result.membership,
    });
  } catch (err) {
    console.error('[events/confirm-join]', err);
    res.status(500).json({ message: err.message || 'Failed to confirm join' });
  }
});

router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.host_id !== req.profile.id) {
      return res.status(403).json({ message: 'Only the host can edit this event' });
    }
    if (event.status !== 'created') {
      return res.status(400).json({ message: 'Only events in created status can be edited' });
    }

    const { count } = await supabase
      .from('event_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', event.id)
      .is('cancelled_at', null);

    if ((count || 0) > 0) {
      return res.status(400).json({
        message: 'Cannot edit after someone has joined — cancel and recreate instead',
      });
    }

    const parsed = validateEventPayload(
      {
        title: req.body?.title ?? event.title,
        summary: req.body?.summary ?? event.summary,
        description: req.body?.description ?? event.description,
        city: req.body?.city ?? event.city,
        precise_address: req.body?.precise_address ?? req.body?.preciseAddress ?? event.precise_address,
        venue_lat: req.body?.venue_lat ?? req.body?.venueLat ?? event.venue_lat,
        venue_lng: req.body?.venue_lng ?? req.body?.venueLng ?? event.venue_lng,
        start_at: req.body?.start_at ?? req.body?.startAt ?? event.start_at,
        duration_minutes: req.body?.duration_minutes ?? req.body?.durationMinutes ?? event.duration_minutes,
        max_spots: req.body?.max_spots ?? req.body?.maxSpots ?? event.max_spots,
      },
      { allowPastStart: false, requireVenueCoords: true }
    );
    if (!parsed.ok) return res.status(400).json({ message: parsed.message });

    const { data: updated, error: updErr } = await supabase
      .from('events')
      .update(parsed.value)
      .eq('id', event.id)
      .select('*')
      .single();
    if (updErr) throw updErr;

    res.json({
      event: serializeEvent(updated, {
        viewerId: req.profile.id,
        isMember: true,
        hostProfile: req.profile,
        memberCount: 0,
      }),
    });
  } catch (err) {
    console.error('[events/patch]', err);
    res.status(500).json({ message: err.message || 'Failed to update event' });
  }
});

router.post('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const result = await cancelEvent({
      eventId: req.params.id,
      actorId: req.profile.id,
      asAdmin: false,
      hostProfile: req.profile,
    });
    if (!result.ok) {
      return res.status(result.status || 400).json({ message: result.message });
    }
    res.json({ event: result.event });
  } catch (err) {
    console.error('[events/cancel]', err);
    res.status(500).json({ message: err.message || 'Failed to cancel event' });
  }
});

router.post('/:id/leave', requireAuth, async (req, res) => {
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

    await supabase
      .from('event_memberships')
      .update({ cancelled_at: new Date().toISOString() })
      .eq('id', membership.id);

    res.json({ ok: true });
  } catch (err) {
    console.error('[events/leave]', err);
    res.status(500).json({ message: err.message || 'Failed to leave event' });
  }
});

router.post('/:id/go-live', requireAuth, async (req, res) => {
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

router.post('/:id/complete', requireAuth, async (req, res) => {
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
router.post('/:id/attendance', requireAuth, async (req, res) => {
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
router.post('/:id/present', requireAuth, async (req, res) => {
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
