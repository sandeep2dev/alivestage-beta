/**
 * Shared confirm / decline logic for dashboard + WhatsApp button paths.
 * Happy path only — refunds are out of scope (TODO where relevant).
 */

const { supabase } = require('../config/supabase');
const { toWhatsAppRecipient } = require('../lib/phone');
const {
  sendPayTokenMessage,
  sendBookingDeclinedMessage,
} = require('./whatsapp');
const { sendMail, bookingAcceptedHtml, bookingRejectedHtml } = require('./email');

function formatEventDate(iso) {
  try {
    return new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  } catch {
    return String(iso);
  }
}

async function loadBookingForArtist(bookingId, artistId) {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      fan:profiles!bookings_fan_id_fkey(id, name, email, phone, whatsapp_verified_at),
      artist:profiles!bookings_artist_id_fkey(id, name, email, phone),
      venue_city:cities!bookings_venue_city_id_fkey(id, name, state)
    `)
    .eq('id', bookingId)
    .eq('artist_id', artistId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Artist confirms a requested booking → awaiting_token + notify fan to pay.
 */
async function confirmBooking(bookingId, artistProfile) {
  const booking = await loadBookingForArtist(bookingId, artistProfile.id);
  if (!booking) {
    return { ok: false, status: 404, message: 'Booking not found' };
  }
  if (booking.source === 'artist_manual') {
    return { ok: false, status: 400, message: 'Offline bookings cannot be confirmed this way' };
  }
  if (booking.status !== 'requested') {
    return { ok: false, status: 409, message: `Booking is already ${booking.status}` };
  }

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'awaiting_token' })
    .eq('id', booking.id)
    .eq('status', 'requested');

  if (error) throw error;

  const eventDate = formatEventDate(booking.event_date);
  const tokenLabel = Number(booking.token_amount).toLocaleString('en-IN');

  if (booking.fan?.phone && booking.fan.whatsapp_verified_at) {
    await sendPayTokenMessage({
      to: toWhatsAppRecipient(booking.fan.phone),
      artistName: artistProfile.name || 'The artist',
      eventDate,
      tokenAmount: tokenLabel,
      bookingId: booking.id,
    });
  }

  if (booking.fan?.email) {
    await sendMail({
      to: booking.fan.email,
      subject: 'Artist confirmed — pay Alivestage fee to lock booking',
      html: bookingAcceptedHtml({
        fanName: booking.fan.name,
        artistName: artistProfile.name,
        remainingAmount: booking.token_amount,
      }),
    });
  }

  return { ok: true, bookingId: booking.id, status: 'awaiting_token' };
}

/**
 * Artist declines a requested booking.
 * TODO: refund logic if a payment was ever taken before decline (not applicable on happy path yet).
 */
async function declineBooking(bookingId, artistProfile) {
  const booking = await loadBookingForArtist(bookingId, artistProfile.id);
  if (!booking) {
    return { ok: false, status: 404, message: 'Booking not found' };
  }
  if (booking.source === 'artist_manual') {
    return { ok: false, status: 400, message: 'Offline bookings cannot be declined this way' };
  }
  if (booking.status !== 'requested') {
    return { ok: false, status: 409, message: `Booking is already ${booking.status}` };
  }

  // TODO(refund): if token was paid before decline in a future flow, refund here.

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'declined' })
    .eq('id', booking.id)
    .eq('status', 'requested');

  if (error) throw error;

  const eventDate = formatEventDate(booking.event_date);

  if (booking.fan?.phone && booking.fan.whatsapp_verified_at) {
    await sendBookingDeclinedMessage({
      to: toWhatsAppRecipient(booking.fan.phone),
      artistName: artistProfile.name || 'The artist',
      eventDate,
    });
  }

  if (booking.fan?.email) {
    await sendMail({
      to: booking.fan.email,
      subject: 'Booking request declined',
      html: bookingRejectedHtml({
        fanName: booking.fan.name,
        artistName: artistProfile.name,
      }),
    });
  }

  return { ok: true, bookingId: booking.id, status: 'declined' };
}

module.exports = { confirmBooking, declineBooking, loadBookingForArtist, formatEventDate };
