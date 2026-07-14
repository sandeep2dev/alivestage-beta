const express = require('express');
const { supabase } = require('../config/supabase');

const router = express.Router();

const ARTIST_SELECT = `
  *,
  profile:profiles!artist_details_id_fkey(id, name, email, avatar_url),
  city:cities!artist_details_city_id_fkey(id, name, state, tier)
`;

router.get('/', async (req, res) => {
  try {
    const { cityId, genre, minRate, maxRate } = req.query;
    let query = supabase
      .from('artist_details')
      .select(ARTIST_SELECT)
      .eq('is_onboarded', true);

    if (cityId) {
      query = query.eq('city_id', cityId);
    }
    if (genre) {
      query = query.contains('genres', [genre]);
    }
    if (minRate) {
      query = query.gte('hourly_rate', Number(minRate));
    }
    if (maxRate) {
      query = query.lte('hourly_rate', Number(maxRate));
    }

    const { data, error } = await query.order('updated_at', { ascending: false });
    if (error) return res.status(500).json({ message: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('artist_details')
      .select(ARTIST_SELECT)
      .eq('id', req.params.id)
      .eq('is_onboarded', true)
      .single();

    if (error || !data) return res.status(404).json({ message: 'Artist not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
