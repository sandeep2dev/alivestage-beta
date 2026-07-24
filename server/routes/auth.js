const { supabase } = require('../config/supabase');
const {
  createOtp,
  createDiscordOtp,
  verifyOtp,
  normalizeEmail,
  discordOtpKey,
} = require('../services/otp');
const { signToken } = require('../services/jwt');
const { sendMail } = require('../services/email');
const { requireAuth } = require('../middleware/auth');
const { sendOtpDm, inviteUrl } = require('../services/discord');
const { serializePublicProfile } = require('../services/reputation');

const router = require('express').Router();

function otpEmailHtml(code) {
  return `
    <h2>Your AliVeStage sign-in code</h2>
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

    const created = createOtp(email);
    if (!created.ok) {
      return res.status(429).json({ message: created.message, retryAfterSec: created.retryAfterSec });
    }
    await sendMail({
      to: email,
      subject: 'Your AliVeStage sign-in code',
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

    const accessToken = signToken(profile);
    res.json({ accessToken, profile });
  } catch (err) {
    console.error('[auth/verify-otp]', err);
    res.status(500).json({ message: err.message || 'Failed to verify OTP' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  res.json({
    profile: req.profile,
    discordInviteUrl: inviteUrl(),
  });
});

router.patch('/profile', requireAuth, async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const city = String(req.body?.city || '').trim();
    const pincode = String(req.body?.pincode || '').trim();
    const discordUsernameRaw = req.body?.discord_username ?? req.body?.discordUsername;
    const discordUsername =
      discordUsernameRaw == null
        ? undefined
        : String(discordUsernameRaw).trim().replace(/^@/, '');

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

    if (discordUsername !== undefined) {
      if (req.profile.verified_at && discordUsername !== req.profile.discord_username) {
        return res.status(400).json({
          message: 'Discord username is locked after verification',
        });
      }
      if (discordUsername.length < 2) {
        return res.status(400).json({ message: 'Discord username is required' });
      }
      updates.discord_username = discordUsername;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    // Complete onboarding once verified + city/pincode present
    const nextCity = updates.city ?? req.profile.city;
    const nextPin = updates.pincode ?? req.profile.pincode;
    if (req.profile.verified_at && nextCity && nextPin) {
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
    const discordUsername = String(
      req.body?.discord_username || req.body?.discordUsername || ''
    )
      .trim()
      .replace(/^@/, '');

    if (name.length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters' });
    }
    if (city.length < 2) {
      return res.status(400).json({ message: 'City is required' });
    }
    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({ message: 'Pincode must be 6 digits' });
    }
    if (discordUsername.length < 2) {
      return res.status(400).json({ message: 'Discord username is required' });
    }
    if (req.profile.verified_at && discordUsername !== req.profile.discord_username) {
      return res.status(400).json({
        message: 'Discord username is locked after verification',
      });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .update({
        name,
        city,
        pincode,
        discord_username: discordUsername,
      })
      .eq('id', req.profile.id)
      .select('*')
      .single();
    if (error) throw error;

    const accessToken = signToken(profile);
    res.json({
      profile,
      accessToken,
      discordInviteUrl: inviteUrl(),
      next: profile.verified_at ? 'done' : 'discord_verify',
    });
  } catch (err) {
    console.error('[auth/onboarding]', err);
    res.status(500).json({ message: err.message || 'Failed to save onboarding' });
  }
});

router.post('/discord/send-otp', requireAuth, async (req, res) => {
  try {
    const discordUsername = String(
      req.body?.discord_username ||
        req.body?.discordUsername ||
        req.profile.discord_username ||
        ''
    )
      .trim()
      .replace(/^@/, '');

    if (!discordUsername) {
      return res.status(400).json({
        message: 'Set your Discord username first, and join the AliVeStage server',
        inviteUrl: inviteUrl(),
      });
    }

    if (req.profile.verified_at) {
      return res.status(400).json({ message: 'Already verified' });
    }

    const created = createDiscordOtp(discordOtpKey(req.profile.id));
    if (!created.ok) {
      return res.status(429).json({
        message: created.message,
        retryAfterSec: created.retryAfterSec,
      });
    }

    // Persist username before DM so verify can lock it
    if (discordUsername !== req.profile.discord_username) {
      const { error } = await supabase
        .from('profiles')
        .update({ discord_username: discordUsername })
        .eq('id', req.profile.id);
      if (error) throw error;
    }

    const sent = await sendOtpDm({
      discordUsername,
      code: created.code,
    });
    if (!sent.ok) {
      return res.status(400).json({ message: sent.message, inviteUrl: inviteUrl() });
    }

    // Stash resolved discord id on profile temporarily via draft field — store in memory on OTP key
    // We return discordId only after verify; keep resolved id on the OTP side-channel:
    req.app.locals.discordResolve = req.app.locals.discordResolve || new Map();
    req.app.locals.discordResolve.set(req.profile.id, sent.discordId);

    res.json({
      message: 'OTP sent via Discord DM',
      inviteUrl: inviteUrl(),
      mock: Boolean(sent.mock),
    });
  } catch (err) {
    console.error('[auth/discord/send-otp]', err);
    res.status(500).json({ message: err.message || 'Failed to send Discord OTP' });
  }
});

router.post('/discord/verify-otp', requireAuth, async (req, res) => {
  try {
    const code = req.body?.otp || req.body?.code;
    if (!code) {
      return res.status(400).json({ message: 'OTP is required' });
    }
    if (req.profile.verified_at) {
      return res.status(400).json({ message: 'Already verified' });
    }
    if (!req.profile.discord_username) {
      return res.status(400).json({ message: 'Discord username is required' });
    }

    const result = verifyOtp(discordOtpKey(req.profile.id), code);
    if (!result.ok) {
      return res.status(400).json({ message: result.message });
    }

    const resolveMap = req.app.locals.discordResolve || new Map();
    let discordId = resolveMap.get(req.profile.id);
    if (!discordId) {
      const { resolveGuildMember } = require('../services/discord');
      const resolved = await resolveGuildMember(req.profile.discord_username);
      if (!resolved.ok) {
        return res.status(400).json({ message: resolved.message, inviteUrl: inviteUrl() });
      }
      discordId = resolved.discordId;
    }

    // Ensure discord_id uniqueness
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('discord_id', discordId)
      .neq('id', req.profile.id)
      .maybeSingle();
    if (existing) {
      return res.status(409).json({
        message: 'This Discord account is already linked to another profile',
      });
    }

    const onboardingComplete = Boolean(req.profile.city && req.profile.pincode);

    const { data: profile, error } = await supabase
      .from('profiles')
      .update({
        discord_id: discordId,
        verified_at: new Date().toISOString(),
        onboarding_complete: onboardingComplete,
      })
      .eq('id', req.profile.id)
      .select('*')
      .single();
    if (error) throw error;

    resolveMap.delete(req.profile.id);

    const accessToken = signToken(profile);
    res.json({ profile, accessToken, verified: true });
  } catch (err) {
    console.error('[auth/discord/verify-otp]', err);
    res.status(500).json({ message: err.message || 'Failed to verify Discord OTP' });
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

module.exports = router;
