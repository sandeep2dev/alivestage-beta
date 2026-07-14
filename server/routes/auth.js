const { supabase } = require('../config/supabase');
const { createOtp, verifyOtp, normalizeEmail } = require('../services/otp');
const { signToken } = require('../services/jwt');
const { sendMail } = require('../services/email');
const { requireAuth } = require('../middleware/auth');

const router = require('express').Router();

function otpEmailHtml(code) {
  return `
    <h2>Your Alivestage sign-in code</h2>
    <p>Use this one-time passcode to sign in or create your account:</p>
    <p style="font-size:28px;letter-spacing:6px;font-weight:bold;">${code}</p>
    <p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>
  `;
}

router.post('/send-otp', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email || !email.includes('@')) {
      return res.status(400).json({ message: 'Valid email is required' });
    }

    const code = createOtp(email);
    await sendMail({
      to: email,
      subject: 'Your Alivestage sign-in code',
      html: otpEmailHtml(code),
    });

    res.json({ message: 'OTP sent' });
  } catch (err) {
    console.error('[auth/send-otp]', err);
    res.status(500).json({ message: err.message || 'Failed to send OTP' });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const code = req.body?.otp || req.body?.token;
    if (!email || !code) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const result = verifyOtp(email, code);
    if (!result.ok) {
      return res.status(400).json({ message: result.message });
    }

    let { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) throw error;

    if (!profile) {
      const name = email.split('@')[0];
      const { data: created, error: createError } = await supabase
        .from('profiles')
        .insert({ email, name, role: 'fan', onboarding_complete: false })
        .select('*')
        .single();
      if (createError) throw createError;
      profile = created;
    }

    const accessToken = signToken(profile);

    let artistDetails = null;
    if (profile.role === 'artist') {
      const { data } = await supabase
        .from('artist_details')
        .select('is_onboarded')
        .eq('id', profile.id)
        .maybeSingle();
      artistDetails = data;
    }

    res.json({
      accessToken,
      profile,
      artistDetails,
    });
  } catch (err) {
    console.error('[auth/verify-otp]', err);
    res.status(500).json({ message: err.message || 'Failed to verify OTP' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  let artistDetails = null;
  if (req.profile.role === 'artist') {
    const { data } = await supabase
      .from('artist_details')
      .select('is_onboarded')
      .eq('id', req.profile.id)
      .maybeSingle();
    artistDetails = data;
  }
  res.json({ profile: req.profile, artistDetails });
});

router.post('/role', requireAuth, async (req, res) => {
  try {
    const role = req.body?.role;
    if (!['fan', 'artist'].includes(role)) {
      return res.status(400).json({ message: 'Role must be fan or artist' });
    }

    if (req.profile.onboarding_complete) {
      return res.status(400).json({ message: 'Role already set' });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .update({ role, onboarding_complete: true })
      .eq('id', req.profile.id)
      .select('*')
      .single();

    if (error) throw error;

    if (role === 'artist') {
      const { error: artistError } = await supabase
        .from('artist_details')
        .upsert({ id: req.profile.id });
      if (artistError) throw artistError;
    }

    const accessToken = signToken(profile);
    res.json({ profile, accessToken });
  } catch (err) {
    console.error('[auth/role]', err);
    res.status(500).json({ message: err.message || 'Failed to set role' });
  }
});

router.post('/onboarding/step1', requireAuth, async (req, res) => {
  try {
    if (req.profile.role !== 'artist') {
      return res.status(403).json({ message: 'Artist only' });
    }

    const { bio, cityId, avatarBase64, avatarFileName } = req.body || {};
    if (!bio || !cityId) {
      return res.status(400).json({ message: 'Bio and city are required' });
    }

    const { data: cityRow, error: cityError } = await supabase
      .from('cities')
      .select('id')
      .eq('id', cityId)
      .maybeSingle();
    if (cityError) throw cityError;
    if (!cityRow) {
      return res.status(400).json({ message: 'Invalid city' });
    }

    let avatarUrl = req.profile.avatar_url || '';

    if (avatarBase64 && avatarFileName) {
      const match = avatarBase64.match(/^data:([^;]+);base64,(.+)$/);
      const contentType = match ? match[1] : 'image/jpeg';
      const base64Data = match ? match[2] : avatarBase64;
      const buffer = Buffer.from(base64Data, 'base64');
      const ext = String(avatarFileName).split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
      const path = `${req.profile.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, buffer, { upsert: true, contentType });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      avatarUrl = data.publicUrl;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', req.profile.id);
    if (profileError) throw profileError;

    const { error: detailsError } = await supabase.from('artist_details').upsert({
      id: req.profile.id,
      bio,
      city_id: cityId,
      updated_at: new Date().toISOString(),
    });
    if (detailsError) throw detailsError;

    res.json({ avatarUrl });
  } catch (err) {
    console.error('[auth/onboarding/step1]', err);
    res.status(500).json({ message: err.message || 'Failed to save step' });
  }
});

router.post('/onboarding/step2', requireAuth, async (req, res) => {
  try {
    if (req.profile.role !== 'artist') {
      return res.status(403).json({ message: 'Artist only' });
    }

    const genres = Array.isArray(req.body?.genres) ? req.body.genres : [];
    const youtubeLinks = Array.isArray(req.body?.youtubeLinks)
      ? req.body.youtubeLinks.filter((l) => String(l || '').trim())
      : [];

    const { error } = await supabase
      .from('artist_details')
      .update({
        genres,
        youtube_links: youtubeLinks,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.profile.id);
    if (error) throw error;

    res.json({ ok: true });
  } catch (err) {
    console.error('[auth/onboarding/step2]', err);
    res.status(500).json({ message: err.message || 'Failed to save step' });
  }
});

router.post('/onboarding/step3', requireAuth, async (req, res) => {
  try {
    if (req.profile.role !== 'artist') {
      return res.status(403).json({ message: 'Artist only' });
    }

    const minBookingAmount = Number(req.body?.minBookingAmount) || 0;
    const hourlyRate = Number(req.body?.hourlyRate) || 0;

    const { error } = await supabase
      .from('artist_details')
      .update({
        min_booking_amount: minBookingAmount,
        hourly_rate: hourlyRate,
        is_onboarded: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.profile.id);
    if (error) throw error;

    res.json({ ok: true });
  } catch (err) {
    console.error('[auth/onboarding/step3]', err);
    res.status(500).json({ message: err.message || 'Failed to complete onboarding' });
  }
});

module.exports = router;
