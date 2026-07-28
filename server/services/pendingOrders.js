/** Short-lived Razorpay order → event/join drafts (persisted in Supabase). */
const { supabase } = require('../config/supabase');

const TTL_MS = 30 * 60 * 1000;

async function saveDraft(orderId, payload) {
  const id = String(orderId);
  const { error } = await supabase.from('pending_orders').upsert(
    {
      order_id: id,
      payload,
      expires_at: new Date(Date.now() + TTL_MS).toISOString(),
    },
    { onConflict: 'order_id' }
  );
  if (error) throw error;
}

async function peekDraft(orderId) {
  const id = String(orderId || '');
  if (!id) return null;

  const { data, error } = await supabase
    .from('pending_orders')
    .select('payload, expires_at')
    .eq('order_id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  if (new Date(data.expires_at).getTime() <= Date.now()) {
    await supabase.from('pending_orders').delete().eq('order_id', id);
    return null;
  }
  return data.payload;
}

async function takeDraft(orderId) {
  const payload = await peekDraft(orderId);
  if (payload) {
    await supabase.from('pending_orders').delete().eq('order_id', String(orderId));
  }
  return payload;
}

module.exports = { saveDraft, peekDraft, takeDraft, TTL_MS };
