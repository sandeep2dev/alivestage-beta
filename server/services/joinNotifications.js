const { supabase } = require('../config/supabase');
const { sendMail } = require('./email');
const { joinConfirmedEmailHtml } = require('./emailTemplates');
const { appUrl } = require('./cancelEvent');
const { JOIN_FEE } = require('../config/community');

async function notifyJoinConfirmed({ event, userId, host, payment }) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, email, name')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!profile?.email) return;

  const eventUrl = `${appUrl()}/events/${event.id}`;
  await sendMail({
    to: profile.email,
    subject: `You're in — ${event.title}`,
    html: joinConfirmedEmailHtml({
      event,
      hostName: host?.name,
      eventUrl,
      amountPaid: payment?.amount ?? JOIN_FEE,
      paymentId: payment?.razorpay_payment_id || payment?.razorpay_order_id || null,
    }),
  });
}

module.exports = {
  notifyJoinConfirmed,
};
