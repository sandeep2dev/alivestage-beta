/**
 * WhatsApp Cloud API (Meta) — OTP + booking templates.
 * When credentials are missing, logs to console (mock) like email.js.
 */

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const TEMPLATES = {
  otp: 'alivestage_whatsapp_otp',
  bookingRequest: 'alivestage_booking_request',
  payToken: 'alivestage_pay_token',
  bookingDeclined: 'alivestage_booking_declined',
};

function isConfigured() {
  return Boolean(
    process.env.WHATSAPP_TOKEN
    && process.env.WHATSAPP_PHONE_NUMBER_ID
  );
}

function graphUrl(path) {
  const version = process.env.WHATSAPP_API_VERSION || 'v21.0';
  return `https://graph.facebook.com/${version}/${path}`;
}

async function graphPost(path, body) {
  const token = process.env.WHATSAPP_TOKEN;
  const res = await fetch(graphUrl(path), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `WhatsApp API ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function sendTemplate({ to, template, languageCode = 'en', components = [] }) {
  if (!isConfigured()) {
    console.log('[whatsapp] (mock) template', {
      to,
      template,
      languageCode,
      components,
    });
    return { mock: true, messages: [{ id: `mock_wamid_${Date.now()}` }] };
  }

  return graphPost(`${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: template,
      language: { code: languageCode },
      components,
    },
  });
}

function bodyParams(texts) {
  return {
    type: 'body',
    parameters: texts.map((text) => ({ type: 'text', text: String(text) })),
  };
}

/** Authentication / utility OTP template: {{1}} = code */
async function sendOtpMessage({ to, code }) {
  return sendTemplate({
    to,
    template: TEMPLATES.otp,
    components: [bodyParams([code])],
  });
}

/**
 * Booking request to artist with Confirm / Decline / View details.
 * Button payloads (for webhook): booking_confirm:{id} | booking_decline:{id}
 */
async function sendBookingRequestMessage({
  to,
  fanName,
  eventDate,
  venue,
  details,
  fee,
  bookingId,
}) {
  const detailUrl = `${APP_URL()}/dashboard/bookings/${bookingId}`;
  const truncatedDetails = String(details || '').slice(0, 200);

  if (!isConfigured()) {
    console.log('[whatsapp] (mock) booking request', {
      to,
      bookingId,
      fanName,
      eventDate,
      venue,
      details: truncatedDetails,
      fee,
      confirmPayload: `booking_confirm:${bookingId}`,
      declinePayload: `booking_decline:${bookingId}`,
      viewDetails: detailUrl,
    });
    return { mock: true };
  }

  return sendTemplate({
    to,
    template: TEMPLATES.bookingRequest,
    components: [
      bodyParams([fanName, eventDate, venue, truncatedDetails, fee]),
      {
        type: 'button',
        sub_type: 'quick_reply',
        index: '0',
        parameters: [{ type: 'payload', payload: `booking_confirm:${bookingId}` }],
      },
      {
        type: 'button',
        sub_type: 'quick_reply',
        index: '1',
        parameters: [{ type: 'payload', payload: `booking_decline:${bookingId}` }],
      },
      {
        type: 'button',
        sub_type: 'url',
        index: '2',
        parameters: [{ type: 'text', text: `dashboard/bookings/${bookingId}` }],
      },
    ],
  });
}

async function sendPayTokenMessage({ to, artistName, eventDate, tokenAmount, bookingId }) {
  const payUrl = `${APP_URL()}/my-bookings?pay=${bookingId}`;

  if (!isConfigured()) {
    console.log('[whatsapp] (mock) pay token', {
      to,
      artistName,
      eventDate,
      tokenAmount,
      payUrl,
    });
    return { mock: true };
  }

  return sendTemplate({
    to,
    template: TEMPLATES.payToken,
    components: [
      bodyParams([artistName, eventDate, tokenAmount, payUrl]),
    ],
  });
}

async function sendBookingDeclinedMessage({ to, artistName, eventDate }) {
  if (!isConfigured()) {
    console.log('[whatsapp] (mock) booking declined', { to, artistName, eventDate });
    return { mock: true };
  }

  return sendTemplate({
    to,
    template: TEMPLATES.bookingDeclined,
    components: [bodyParams([artistName, eventDate])],
  });
}

module.exports = {
  TEMPLATES,
  isConfigured,
  sendOtpMessage,
  sendBookingRequestMessage,
  sendPayTokenMessage,
  sendBookingDeclinedMessage,
  sendTemplate,
};
