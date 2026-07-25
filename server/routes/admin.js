const { supabase } = require('../config/supabase');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = require('express').Router();

router.use(requireAuth, requireAdmin);

router.get('/events', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('id, title, city, status, start_at, host_id, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    res.json({ events: data || [] });
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
        'id, name, email, city, reputation_score, rating_count, created_at'
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

module.exports = router;
