const express = require('express');
const { supabase } = require('../config/supabase');

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('cities')
      .select('id, name, state, tier')
      .order('tier', { ascending: true })
      .order('name', { ascending: true });

    if (error) return res.status(500).json({ message: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
