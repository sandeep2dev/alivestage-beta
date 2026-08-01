const { supabase } = require('../config/supabase');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { cancelEvent } = require('../services/cancelEvent');
const { countActiveMembersByEventIds } = require('../services/eventCapacity');

const router = require('express').Router();

router.use(requireAuth, requireAdmin);

router.get('/events', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('id, title, city, status, start_at, host_id, created_at, max_spots')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;

    const counts = await countActiveMembersByEventIds((data || []).map((e) => e.id));
    const events = (data || []).map((event) => {
      const memberCount = counts[event.id] ?? 0;
      const maxSpots = Number(event.max_spots) || 0;
      return {
        ...event,
        member_count: memberCount,
        spots_remaining: Math.max(0, maxSpots - memberCount),
        is_full: memberCount >= maxSpots,
      };
    });

    res.json({ events });
  } catch (err) {
    console.error('[admin/events]', err);
    res.status(500).json({ message: err.message || 'Failed to load events' });
  }
});

router.get('/users', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id, name, email, city, role, reputation_score, rating_count, banned_at, created_at'
      )
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    res.json({ users: data || [] });
  } catch (err) {
    console.error('[admin/users]', err);
    res.status(500).json({ message: err.message || 'Failed to load users' });
  }
});

/** Force-cancel an event and refund joiners (admin). */
router.post('/events/:id/cancel', async (req, res) => {
  try {
    const result = await cancelEvent({
      eventId: req.params.id,
      actorId: req.profile.id,
      asAdmin: true,
    });
    if (!result.ok) {
      return res.status(result.status || 400).json({ message: result.message });
    }
    res.json({ event: result.event });
  } catch (err) {
    console.error('[admin/events/:id/cancel]', err);
    res.status(500).json({ message: err.message || 'Failed to cancel event' });
  }
});

/** Promote or demote a user. */
router.post('/users/:id/role', async (req, res) => {
  try {
    const role = String(req.body?.role || '').trim();
    if (!['member', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'role must be member or admin' });
    }
    if (req.params.id === req.profile.id && role !== 'admin') {
      return res.status(400).json({ message: 'Cannot demote yourself' });
    }

    const { data: user, error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', req.params.id)
      .select(
        'id, name, email, city, role, reputation_score, rating_count, banned_at, created_at'
      )
      .single();
    if (error) throw error;
    res.json({ user });
  } catch (err) {
    console.error('[admin/users/:id/role]', err);
    res.status(500).json({ message: err.message || 'Failed to update role' });
  }
});

/** Soft-ban or unban a user. */
router.post('/users/:id/ban', async (req, res) => {
  try {
    const banned = req.body?.banned !== false && req.body?.banned !== 'false';
    if (req.params.id === req.profile.id) {
      return res.status(400).json({ message: 'Cannot ban yourself' });
    }

    const { data: user, error } = await supabase
      .from('profiles')
      .update({ banned_at: banned ? new Date().toISOString() : null })
      .eq('id', req.params.id)
      .select(
        'id, name, email, city, role, reputation_score, rating_count, banned_at, created_at'
      )
      .single();
    if (error) throw error;
    res.json({ user });
  } catch (err) {
    console.error('[admin/users/:id/ban]', err);
    res.status(500).json({ message: err.message || 'Failed to update ban status' });
  }
});

module.exports = router;
