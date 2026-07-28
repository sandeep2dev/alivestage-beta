const { supabase } = require('../config/supabase');
const { createOtp, verifyOtp, normalizeEmail } = require('../services/otp');
const { signToken } = require('../services/jwt');
const { sendMail } = require('../services/email');
const { requireAuth } = require('../middleware/auth');
const { serializePublicProfile } = require('../services/reputation');
const { serializeEvent } = require('../services/eventSerializer');

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

    const created = await createOtp(email, { enforceCooldown: true });
    if (!created.ok) {
      return res.status(429).json({ message: created.message, retryAfterSec: created.retryAfterSec });
    }
    await sendMail({
      to: email,
      subject: 'Your Alivestage sign-in code',
      html: otpEmailHtml(created.code),
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

    const result = await verifyOtp(email, code);
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
        .insert({
          email,
          name,
          role: 'member',
          onboarding_complete: false,
        })
        .select('*')
        .single();
      if (createError) throw createError;
      profile = created;
    }

    if (profile.banned_at) {
      return res.status(403).json({ message: 'Account suspended', code: 'BANNED' });
    }

    const accessToken = signToken(profile);
    res.json({ accessToken, profile });
  } catch (err) {
    console.error('[auth/verify-otp]', err);
    res.status(500).json({ message: err.message || 'Failed to verify OTP' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  res.json({ profile: req.profile });
});

router.patch('/profile', requireAuth, async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const city = String(req.body?.city || '').trim();
    const pincode = String(req.body?.pincode || '').trim();

    const updates = {};

    if (name) {
      if (name.length < 2) {
        return res.status(400).json({ message: 'Name must be at least 2 characters' });
      }
      if (name.length > 80) {
        return res.status(400).json({ message: 'Name must be at most 80 characters' });
      }
      updates.name = name;
    }

    if (city !== undefined && req.body?.city != null) {
      if (city.length < 2) {
        return res.status(400).json({ message: 'City is required' });
      }
      updates.city = city;
    }

    if (pincode !== undefined && req.body?.pincode != null) {
      if (!/^\d{6}$/.test(pincode)) {
        return res.status(400).json({ message: 'Pincode must be 6 digits' });
      }
      updates.pincode = pincode;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    const nextCity = updates.city ?? req.profile.city;
    const nextPin = updates.pincode ?? req.profile.pincode;
    if (nextCity && nextPin) {
      updates.onboarding_complete = true;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', req.profile.id)
      .select('*')
      .single();
    if (error) throw error;

    const accessToken = signToken(profile);
    res.json({ profile, accessToken });
  } catch (err) {
    console.error('[auth/profile]', err);
    res.status(500).json({ message: err.message || 'Failed to update profile' });
  }
});

router.post('/onboarding', requireAuth, async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const city = String(req.body?.city || '').trim();
    const pincode = String(req.body?.pincode || '').trim();

    if (name.length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters' });
    }
    if (city.length < 2) {
      return res.status(400).json({ message: 'City is required' });
    }
    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({ message: 'Pincode must be 6 digits' });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .update({
        name,
        city,
        pincode,
        onboarding_complete: true,
      })
      .eq('id', req.profile.id)
      .select('*')
      .single();
    if (error) throw error;

    const accessToken = signToken(profile);
    res.json({
      profile,
      accessToken,
      next: 'done',
    });
  } catch (err) {
    console.error('[auth/onboarding]', err);
    res.status(500).json({ message: err.message || 'Failed to save onboarding' });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!profile) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ profile: serializePublicProfile(profile) });
  } catch (err) {
    console.error('[auth/users/:id]', err);
    res.status(500).json({ message: err.message || 'Failed to load profile' });
  }
});

router.get('/users/:id/events', async (req, res) => {
  try {
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .eq('host_id', req.params.id)
      .in('status', ['created', 'live', 'completed'])
      .order('start_at', { ascending: false })
      .limit(12);
    if (error) throw error;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, name, city, avatar_url, reputation_score, rating_count')
      .eq('id', req.params.id)
      .maybeSingle();

    res.json({
      events: (events || []).map((event) =>
        serializeEvent(event, {
          viewerId: null,
          isMember: false,
          hostProfile: profile,
        })
      ),
    });
  } catch (err) {
    console.error('[auth/users/:id/events]', err);
    res.status(500).json({ message: err.message || 'Failed to load jams' });
  }
});

/** Upload avatar (base64 JPEG/PNG/WebP) → Supabase Storage `avatars` bucket. */
router.post('/avatar', requireAuth, async (req, res) => {
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
    const path = `${req.profile.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, buffer, { contentType, upsert: true });
    if (uploadError) throw uploadError;

    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
    const avatarUrl = `${pub.publicUrl}?t=${Date.now()}`;

    const { data: profile, error } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', req.profile.id)
      .select('*')
      .single();
    if (error) throw error;

    const accessToken = signToken(profile);
    res.json({ profile, accessToken, avatar_url: avatarUrl });
  } catch (err) {
    console.error('[auth/avatar]', err);
    res.status(500).json({ message: err.message || 'Failed to upload avatar' });
  }
});

module.exports = router;
