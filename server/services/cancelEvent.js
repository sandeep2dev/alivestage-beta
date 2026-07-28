/**
 * Shared host/admin event cancel with joiner refunds.
 */
const { supabase } = require('../config/supabase');
const { refundPayment } = require('./payment');
const { sendMail } = require('./email');
const { serializeEvent } = require('./eventSerializer');
const { JOIN_FEE } = require('../config/community');

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}

async function notifyJoinersCancelled(event, joiners) {
  const link = `${appUrl()}/events/${event.id}`;
  for (const row of joiners || []) {
    const profile = row.profile || row;
    if (profile?.email) {
      await sendMail({
        to: profile.email,
        subject: `Jam cancelled: ${event.title}`,
        html: `
          <h2>Event cancelled</h2>
          <p>Hi ${profile.name || 'there'},</p>
          <p>The host cancelled <strong>${event.title}</strong> in ${event.city}.</p>
          <p>Your ₹${JOIN_FEE} join fee has been fully refunded.</p>
          <p><a href="${link}">View event</a></p>
        `,
      });
    }
  }
}

/**
 * Cancel an open event and refund all active joiners in full.
 * @param {{ eventId: string, actorId: string, asAdmin?: boolean, hostProfile?: object }} opts
 */
async function cancelEvent({ eventId, actorId, asAdmin = false, hostProfile = null }) {
  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .maybeSingle();
  if (error) throw error;
  if (!event) return { ok: false, status: 404, message: 'Event not found' };

  if (!asAdmin && event.host_id !== actorId) {
    return { ok: false, status: 403, message: 'Only the host can cancel this event' };
  }
  if (['completed', 'cancelled'].includes(event.status)) {
    return { ok: false, status: 400, message: `Event is already ${event.status}` };
  }

  const { data: memberships } = await supabase
    .from('event_memberships')
    .select(
      '*, payment:payments(*), profile:profiles!event_memberships_user_id_fkey(id, email, name)'
    )
    .eq('event_id', event.id)
    .is('cancelled_at', null);

  for (const m of memberships || []) {
    const payment = m.payment;
    if (payment?.razorpay_payment_id && payment.status === 'paid') {
      await refundPayment(payment.razorpay_payment_id, JOIN_FEE);
      await supabase
        .from('payments')
        .update({
          status: 'refunded_full',
          refund_amount: JOIN_FEE,
          refund_reason: 'host_cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.id);
    }
    await supabase
      .from('event_memberships')
      .update({ cancelled_at: new Date().toISOString() })
      .eq('id', m.id);
  }

  const { data: updated, error: updErr } = await supabase
    .from('events')
    .update({ status: 'cancelled' })
    .eq('id', event.id)
    .select('*')
    .single();
  if (updErr) throw updErr;

  await notifyJoinersCancelled(updated, memberships);

  const host = asAdmin
    ? (
        await supabase
          .from('profiles')
          .select('id, name, city, avatar_url, reputation_score, rating_count')
          .eq('id', updated.host_id)
          .maybeSingle()
      ).data
    : hostProfile;

  return {
    ok: true,
    event: serializeEvent(updated, {
      viewerId: actorId,
      isMember: true,
      hostProfile: host,
    }),
  };
}

module.exports = { cancelEvent, notifyJoinersCancelled, appUrl };
