const cron = require('node-cron');
const { supabase } = require('../config/supabase');
const { refundPayment } = require('./payment');
const { sendMail, bookingAutoRejectedHtml, bookingCancelledHtml } = require('./email');

async function processExpiredPendingBookings() {
  const now = new Date().toISOString();
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, fan:profiles!bookings_fan_id_fkey(email, name), artist:profiles!bookings_artist_id_fkey(name)')
    .eq('status', 'pending')
    .lt('artist_response_deadline', now);

  for (const booking of bookings || []) {
    const { data: tokenPayment } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', booking.id)
      .eq('payment_type', 'token')
      .single();

    if (tokenPayment?.razorpay_payment_id) {
      await refundPayment(tokenPayment.razorpay_payment_id, tokenPayment.amount_captured);
      await supabase
        .from('payments')
        .update({ status: 'refunded', updated_at: now })
        .eq('id', tokenPayment.id);
    }

    await supabase.from('bookings').update({ status: 'rejected' }).eq('id', booking.id);

    if (booking.fan?.email) {
      await sendMail({
        to: booking.fan.email,
        subject: 'Booking request expired — refund issued',
        html: bookingAutoRejectedHtml({ fanName: booking.fan.name }),
      });
    }
    console.log('[cron] Auto-rejected booking', booking.id);
  }
}

async function processUnpaidBalanceBookings() {
  const now = new Date().toISOString();
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, fan:profiles!bookings_fan_id_fkey(email, name), artist:profiles!bookings_artist_id_fkey(name, id)')
    .eq('status', 'confirmed')
    .lt('balance_due_deadline', now);

  for (const booking of bookings || []) {
    const { data: balancePayment } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', booking.id)
      .eq('payment_type', 'balance')
      .eq('status', 'fully_paid')
      .maybeSingle();

    if (balancePayment) continue;

    const { data: tokenPayment } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', booking.id)
      .eq('payment_type', 'token')
      .single();

    if (tokenPayment) {
      await supabase
        .from('payments')
        .update({
          status: 'released_to_artist',
          artist_payout_amount: tokenPayment.amount_captured,
          updated_at: now,
        })
        .eq('id', tokenPayment.id);
    }

    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', booking.id);

    if (booking.fan?.email) {
      await sendMail({
        to: booking.fan.email,
        subject: 'Booking cancelled — balance not paid',
        html: bookingCancelledHtml({
          fanName: booking.fan.name,
          reason: 'The remaining balance was not paid 48 hours before the event. The token has been transferred to the artist as a cancellation fee.',
        }),
      });
    }
    console.log('[cron] Cancelled unpaid balance booking', booking.id);
  }
}

function registerCronJobs() {
  cron.schedule('0 * * * *', async () => {
    try {
      await processExpiredPendingBookings();
      await processUnpaidBalanceBookings();
    } catch (err) {
      console.error('[cron] Job failed', err);
    }
  });
  console.log('[cron] Registered hourly edge-case jobs');
}

module.exports = { registerCronJobs, processExpiredPendingBookings, processUnpaidBalanceBookings };
