const cron = require('node-cron');
const { supabase } = require('../config/supabase');
const { toWhatsAppRecipient } = require('../lib/phone');
const { sendBookingDeclinedMessage } = require('./whatsapp');
const { sendMail, bookingAutoRejectedHtml } = require('./email');
const { formatEventDate } = require('./bookingActions');

/**
 * Auto-decline booking requests past artist_response_deadline.
 * TODO(refund): not applicable — no payment taken before artist confirms.
 */
async function processExpiredRequestedBookings() {
  const now = new Date().toISOString();
  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      *,
      fan:profiles!bookings_fan_id_fkey(email, name, phone, whatsapp_verified_at),
      artist:profiles!bookings_artist_id_fkey(name)
    `)
    .eq('status', 'requested')
    .lt('artist_response_deadline', now);

  for (const booking of bookings || []) {
    await supabase
      .from('bookings')
      .update({ status: 'declined' })
      .eq('id', booking.id)
      .eq('status', 'requested');

    const eventDate = formatEventDate(booking.event_date);
    const artistName = booking.artist?.name || 'The artist';

    if (booking.fan?.phone && booking.fan.whatsapp_verified_at) {
      await sendBookingDeclinedMessage({
        to: toWhatsAppRecipient(booking.fan.phone),
        artistName,
        eventDate,
      });
    }

    if (booking.fan?.email) {
      await sendMail({
        to: booking.fan.email,
        subject: 'Booking request expired',
        html: bookingAutoRejectedHtml({ fanName: booking.fan.name }),
      });
    }
    console.log('[cron] Auto-declined booking', booking.id);
  }
}

function registerCronJobs() {
  cron.schedule('0 * * * *', async () => {
    try {
      await processExpiredRequestedBookings();
    } catch (err) {
      console.error('[cron] Job failed', err);
    }
  });
  console.log('[cron] Registered hourly booking deadline jobs');
}

module.exports = {
  registerCronJobs,
  processExpiredRequestedBookings,
  // Legacy export name kept for smoke test compatibility
  processExpiredPendingBookings: processExpiredRequestedBookings,
};
