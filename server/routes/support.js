const express = require('express');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, async (req, res) => {
  try {
    const message = String(req.body?.message || '').trim();
    if (message.length < 10) {
      return res.status(400).json({ message: 'Please enter at least 10 characters' });
    }
    if (message.length > 2000) {
      return res.status(400).json({ message: 'Message must be at most 2000 characters' });
    }

    const webhookUrl = process.env.DISCORD_SUPPORT_WEBHOOK_URL;
    const payload = {
      content: [
        '**Alivestage support request**',
        `**From:** ${req.profile.name || '—'}`,
        `**Email:** ${req.profile.email}`,
        `**Role:** ${req.profile.role}`,
        '',
        message,
      ].join('\n'),
    };

    if (!webhookUrl) {
      console.log('[support] (mock Discord)', payload.content);
      return res.json({ ok: true, mock: true });
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error('[support] Discord webhook failed', response.status, text);
      return res.status(502).json({ message: 'Failed to send support message. Try again later.' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[support]', err);
    res.status(500).json({ message: err.message || 'Failed to send support message' });
  }
});

module.exports = router;
