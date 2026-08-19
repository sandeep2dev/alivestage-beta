/**
 * Shared host/admin event cancel — fees are non-refundable.
 */
const { supabase } = require('../config/supabase');
const { sendMail } = require('./email');
const { jamCancelledEmailHtml } = require('./emailTemplates');
const { serializeEvent } = require('./eventSerializer');

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
        html: jamCancelledEmailHtml({
          event,
          profileName: profile.name,
          eventUrl: link,
        }),
      });
    }
  }
}

/**
 * Cancel an open event and soft-delete active joiner memberships.
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
