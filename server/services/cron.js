const cron = require('node-cron');
const { supabase } = require('../config/supabase');
const { sendMail } = require('./email');
const { sendDirectMessage } = require('./discord');
const { RATING_GRACE_HOURS } = require('../config/community');

/**
 * After end_at + grace, once per completed event: prompt attended members to rate.
 */
async function processRatingPrompts() {
  const graceCutoff = new Date(
    Date.now() - RATING_GRACE_HOURS * 60 * 60 * 1000
  ).toISOString();

  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'completed')
    .is('rating_prompts_sent_at', null)
    .lt('end_at', graceCutoff)
    .not('rating_window_closes_at', 'is', null);

  if (error) throw error;

  for (const event of events || []) {
    if (
      event.rating_window_closes_at &&
      new Date(event.rating_window_closes_at).getTime() < Date.now()
    ) {
      // Window already closed — mark prompts as handled so we don't retry forever
      await supabase
        .from('events')
        .update({ rating_prompts_sent_at: new Date().toISOString() })
        .eq('id', event.id);
      continue;
    }

    const { data: memberships } = await supabase
      .from('event_memberships')
      .select(
        'user_id, profile:profiles!event_memberships_user_id_fkey(id, email, name, discord_id)'
      )
      .eq('event_id', event.id)
      .is('cancelled_at', null)
      .eq('host_marked_attended', true);

    const { data: host } = await supabase
      .from('profiles')
      .select('id, email, name, discord_id')
      .eq('id', event.host_id)
      .maybeSingle();

    const recipients = [...(memberships || []).map((m) => m.profile), host].filter(Boolean);
    const seen = new Set();

    for (const profile of recipients) {
      if (!profile?.id || seen.has(profile.id)) continue;
      seen.add(profile.id);

      const subject = `Rate your jam: ${event.title}`;
      const html = `
        <h2>How was the jam?</h2>
        <p>Hi ${profile.name || 'there'},</p>
        <p>Please rate people you jammed with at <strong>${event.title}</strong>.</p>
        <p>The rating window closes soon — open AliVeStage to submit your ratings.</p>
      `;

      if (profile.email) {
        await sendMail({ to: profile.email, subject, html });
      }
      if (profile.discord_id) {
        await sendDirectMessage(
          profile.discord_id,
          `AliVeStage: Rate your jam "${event.title}" before the window closes.`
        );
      }
    }

    await supabase
      .from('events')
      .update({ rating_prompts_sent_at: new Date().toISOString() })
      .eq('id', event.id);

    console.log('[cron] Rating prompts sent for event', event.id);
  }
}

function registerCronJobs() {
  cron.schedule('0 * * * *', async () => {
    try {
      await processRatingPrompts();
    } catch (err) {
      console.error('[cron] Rating prompt job failed', err);
    }
  });
  console.log('[cron] Registered hourly rating-prompt jobs');
}

module.exports = {
  registerCronJobs,
  processRatingPrompts,
};
