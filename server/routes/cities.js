const { supabase } = require('../config/supabase');

const router = require('express').Router();

/** GET /api/cities?q=mum — autocomplete suggestions */
router.get('/', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 1) {
      const { data, error } = await supabase
        .from('cities')
        .select('id, name, state')
        .order('name', { ascending: true })
        .limit(20);
      if (error) throw error;
      return res.json({ cities: data || [] });
    }

    const { data, error } = await supabase
      .from('cities')
      .select('id, name, state')
      .ilike('name', `${q}%`)
      .order('name', { ascending: true })
      .limit(15);
    if (error) throw error;

    // Also match contains if prefix results are thin
    let cities = data || [];
    if (cities.length < 5) {
      const { data: more, error: moreErr } = await supabase
        .from('cities')
        .select('id, name, state')
        .ilike('name', `%${q}%`)
        .order('name', { ascending: true })
        .limit(15);
      if (moreErr) throw moreErr;
      const seen = new Set(cities.map((c) => c.id));
      for (const c of more || []) {
        if (!seen.has(c.id)) {
          cities.push(c);
          seen.add(c.id);
        }
      }
      cities = cities.slice(0, 15);
    }

    res.json({ cities });
  } catch (err) {
    console.error('[cities]', err);
    res.status(500).json({ message: err.message || 'Failed to search cities' });
  }
});

module.exports = router;
