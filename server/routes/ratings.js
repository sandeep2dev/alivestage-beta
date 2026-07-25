const { supabase } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');
const { applyRatingToReputation } = require('../services/reputation');

const router = require('express').Router();

async function activeMembership(eventId, userId) {
  const { data } = await supabase
    .from('event_memberships')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .is('cancelled_at', null)
    .maybeSingle();
  return data;
}

/**
 * Submit a rating for a person at a completed event.
 * rating_type: host_rating (ratee is host) | joiner_rating (ratee is a joiner)
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const eventId = req.body?.event_id || req.body?.eventId;
    const rateeId = req.body?.ratee_id || req.body?.rateeId;
    const ratingType = req.body?.rating_type || req.body?.ratingType;
    const score = Number(req.body?.score);

    if (!eventId || !rateeId || !ratingType || !Number.isFinite(score)) {
      return res.status(400).json({
        message: 'event_id, ratee_id, rating_type, and score are required',
      });
    }
    if (!['host_rating', 'joiner_rating'].includes(ratingType)) {
      return res.status(400).json({ message: 'Invalid rating_type' });
    }
    if (score < 1 || score > 5 || !Number.isInteger(score)) {
      return res.status(400).json({ message: 'Score must be an integer 1–5' });
    }
    if (rateeId === req.profile.id) {
      return res.status(400).json({ message: 'Cannot rate yourself' });
    }

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .maybeSingle();
    if (eventError) throw eventError;
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.status !== 'completed') {
      return res.status(400).json({ message: 'Ratings open only after the host marks completed' });
    }
    if (
      event.rating_window_closes_at &&
      new Date(event.rating_window_closes_at).getTime() < Date.now()
    ) {
      return res.status(400).json({ message: 'Rating window has closed' });
    }

    const raterIsHost = event.host_id === req.profile.id;
    const rateeIsHost = event.host_id === rateeId;

    if (ratingType === 'host_rating') {
      if (!rateeIsHost) {
        return res.status(400).json({ message: 'host_rating must target the event host' });
      }
      if (raterIsHost) {
        return res.status(400).json({ message: 'Host cannot submit host_rating' });
      }
      const raterMem = await activeMembership(eventId, req.profile.id);
      if (!raterMem?.host_marked_attended) {
        return res.status(403).json({
          message: 'Only attended joiners can rate the host',
        });
      }
    } else {
      // joiner_rating
      if (rateeIsHost) {
        return res.status(400).json({ message: 'Use host_rating to rate the host' });
      }
      const rateeMem = await activeMembership(eventId, rateeId);
      if (!rateeMem?.host_marked_attended) {
        return res.status(403).json({
          message: 'Ratee must be marked attended by the host',
        });
      }
      if (raterIsHost) {
        // host rating a joiner — allowed
      } else {
        const raterMem = await activeMembership(eventId, req.profile.id);
        if (!raterMem?.host_marked_attended) {
          return res.status(403).json({
            message: 'Only attended participants can rate joiners',
          });
        }
      }
    }

    const { data: existing } = await supabase
      .from('ratings')
      .select('id')
      .eq('event_id', eventId)
      .eq('rater_id', req.profile.id)
      .eq('ratee_id', rateeId)
      .maybeSingle();
    if (existing) {
      return res.status(409).json({ message: 'You already rated this person for this event' });
    }

    const { data: rating, error: insertError } = await supabase
      .from('ratings')
      .insert({
        event_id: eventId,
        rater_id: req.profile.id,
        ratee_id: rateeId,
        rating_type: ratingType,
        score,
      })
      .select('*')
      .single();
    if (insertError) throw insertError;

    await applyRatingToReputation(rateeId, score);

    res.status(201).json({ rating });
  } catch (err) {
    console.error('[ratings/create]', err);
    res.status(500).json({ message: err.message || 'Failed to submit rating' });
  }
});

/** List people the current user can still rate for an event */
router.get('/eligible/:eventId', requireAuth, async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .maybeSingle();
    if (error) throw error;
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const windowOpen =
      event.status === 'completed' &&
      (!event.rating_window_closes_at ||
        new Date(event.rating_window_closes_at).getTime() >= Date.now());

    if (!windowOpen) {
      return res.json({ eligible: [], windowOpen: false, event });
    }

    const raterIsHost = event.host_id === req.profile.id;
    const raterMem = raterIsHost
      ? { host_marked_attended: true }
      : await activeMembership(eventId, req.profile.id);

    if (!raterMem?.host_marked_attended && !raterIsHost) {
      return res.json({ eligible: [], windowOpen: true, reason: 'not_attended' });
    }

    const { data: members } = await supabase
      .from('event_memberships')
      .select(
        'user_id, host_marked_attended, profile:profiles!event_memberships_user_id_fkey(id, name, avatar_url)'
      )
      .eq('event_id', eventId)
      .is('cancelled_at', null)
      .eq('host_marked_attended', true);

    const { data: host } = await supabase
      .from('profiles')
      .select('id, name, avatar_url')
      .eq('id', event.host_id)
      .single();

    const { data: already } = await supabase
      .from('ratings')
      .select('ratee_id')
      .eq('event_id', eventId)
      .eq('rater_id', req.profile.id);
    const rated = new Set((already || []).map((r) => r.ratee_id));

    const eligible = [];

    if (!raterIsHost && host && !rated.has(host.id)) {
      eligible.push({
        ratee_id: host.id,
        rating_type: 'host_rating',
        profile: host,
      });
    }

    for (const m of members || []) {
      if (m.user_id === req.profile.id) continue;
      if (rated.has(m.user_id)) continue;
      eligible.push({
        ratee_id: m.user_id,
        rating_type: 'joiner_rating',
        profile: m.profile,
      });
    }

    res.json({ eligible, windowOpen: true });
  } catch (err) {
    console.error('[ratings/eligible]', err);
    res.status(500).json({ message: err.message || 'Failed to load eligible ratings' });
  }
});

module.exports = router;
