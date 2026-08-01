const { supabase } = require('../config/supabase');

async function countActiveMembers(eventId) {
  const { count, error } = await supabase
    .from('event_memberships')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .is('cancelled_at', null);
  if (error) throw error;
  return count || 0;
}

async function countActiveMembersByEventIds(eventIds) {
  const ids = [...new Set((eventIds || []).filter(Boolean))];
  if (!ids.length) return {};

  const { data, error } = await supabase
    .from('event_memberships')
    .select('event_id')
    .in('event_id', ids)
    .is('cancelled_at', null);
  if (error) throw error;

  const counts = {};
  for (const row of data || []) {
    counts[row.event_id] = (counts[row.event_id] || 0) + 1;
  }
  return counts;
}

function capacityFromCount(maxSpots, memberCount) {
  const max = Number(maxSpots) || 0;
  const count = Number(memberCount) || 0;
  const spotsRemaining = Math.max(0, max - count);
  return {
    member_count: count,
    spots_remaining: spotsRemaining,
    is_full: count >= max,
  };
}

async function assertEventHasCapacity(event) {
  const memberCount = await countActiveMembers(event.id);
  const { is_full } = capacityFromCount(event.max_spots, memberCount);
  if (is_full) {
    return { ok: false, message: 'This jam is full' };
  }
  return { ok: true, memberCount };
}

module.exports = {
  countActiveMembers,
  countActiveMembersByEventIds,
  capacityFromCount,
  assertEventHasCapacity,
};
