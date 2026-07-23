const crypto = require('crypto');
const { supabase } = require('../config/supabase');
const { confirmBooking, declineBooking } = require('../services/bookingActions');

function verifyMetaSignature(rawBody, signatureHeader) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    console.warn('[whatsapp/webhook] WHATSAPP_APP_SECRET unset — skipping signature check');
    return true;
  }
  if (!signatureHeader || !String(signatureHeader).startsWith('sha256=')) {
    return false;
  }
  const expected = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex');
  const received = String(signatureHeader).slice('sha256='.length);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
  } catch {
    return false;
  }
}

async function claimEventId(id, eventType, meta) {
  if (!id) return { isNew: true };
  const { error } = await supabase.from('whatsapp_webhook_events').insert({
    id,
    event_type: eventType || '',
    meta: meta || null,
  });
  if (error) {
    if (error.code === '23505') {
      return { isNew: false };
    }
    throw error;
  }
  return { isNew: true };
}

async function findArtistByWhatsAppFrom(waFrom) {
  const digits = String(waFrom || '').replace(/\D/g, '');
  const local = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits;
  if (!/^[6-9]\d{9}$/.test(local)) return null;

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('phone', local)
    .eq('role', 'artist')
    .not('whatsapp_verified_at', 'is', null)
    .maybeSingle();

  return data;
}

function parseButtonAction(message) {
  const button = message?.button;
  if (button?.payload) {
    return String(button.payload);
  }
  const reply = message?.interactive?.button_reply;
  if (reply?.id) return String(reply.id);
  return null;
}

async function handleInboundMessage(message, contacts) {
  const messageId = message?.id;
  const claim = await claimEventId(messageId, message?.type || 'message', {
    from: message?.from,
    timestamp: message?.timestamp,
  });
  if (!claim.isNew) {
    console.log('[whatsapp/webhook] duplicate message ignored', messageId);
    return;
  }

  const payload = parseButtonAction(message);
  if (!payload) return;

  const confirmMatch = payload.match(/^booking_confirm:(.+)$/i);
  const declineMatch = payload.match(/^booking_decline:(.+)$/i);
  let action = null;
  let bookingId = null;
  if (confirmMatch) {
    action = 'confirm';
    bookingId = confirmMatch[1];
  } else if (declineMatch) {
    action = 'decline';
    bookingId = declineMatch[1];
  } else {
    return;
  }

  const artist = await findArtistByWhatsAppFrom(message.from);
  if (!artist) {
    console.warn('[whatsapp/webhook] no verified artist for', message.from, contacts?.[0]?.profile?.name);
    return;
  }

  if (action === 'confirm') {
    const result = await confirmBooking(bookingId, artist);
    console.log('[whatsapp/webhook] confirm', bookingId, result);
  } else {
    const result = await declineBooking(bookingId, artist);
    console.log('[whatsapp/webhook] decline', bookingId, result);
  }
}

/** Meta subscription verification (GET) */
function verifyChallenge(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && verifyToken && token === verifyToken) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
}

/**
 * Inbound events (POST). Expects req.body as Buffer from express.raw.
 */
async function handleWebhook(req, res) {
  try {
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}));

    const signature = req.get('x-hub-signature-256');
    if (!verifyMetaSignature(rawBody, signature)) {
      return res.sendStatus(401);
    }

    let payload;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      return res.sendStatus(400);
    }

    res.sendStatus(200);

    const entries = payload?.entry || [];
    for (const entry of entries) {
      for (const change of entry.changes || []) {
        const value = change.value || {};
        for (const message of value.messages || []) {
          try {
            await handleInboundMessage(message, value.contacts);
          } catch (err) {
            console.error('[whatsapp/webhook] message handler failed', err);
          }
        }
        for (const status of value.statuses || []) {
          try {
            await claimEventId(status.id, `status:${status.status}`, status);
          } catch (err) {
            console.error('[whatsapp/webhook] status claim failed', err);
          }
        }
      }
    }
  } catch (err) {
    console.error('[whatsapp/webhook]', err);
    if (!res.headersSent) res.sendStatus(500);
  }
}

module.exports = { verifyChallenge, handleWebhook };
