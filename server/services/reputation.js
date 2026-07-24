const { supabase } = require('../config/supabase');
const { REPUTATION_DISPLAY_THRESHOLD } = require('../config/community');
const { publicReputation } = require('./eventSerializer');

/**
 * Recalculate running average reputation for a ratee after a new rating.
 */
async function applyRatingToReputation(rateeId, newScore) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('reputation_score, rating_count')
    .eq('id', rateeId)
    .single();
  if (error) throw error;

  const prevCount = Number(profile.rating_count || 0);
  const prevScore = profile.reputation_score == null ? 0 : Number(profile.reputation_score);
  const nextCount = prevCount + 1;
  const nextScore =
    prevCount === 0
      ? Number(newScore)
      : Math.round(((prevScore * prevCount + Number(newScore)) / nextCount) * 100) / 100;

  const { data: updated, error: updateError } = await supabase
    .from('profiles')
    .update({
      reputation_score: nextScore,
      rating_count: nextCount,
    })
    .eq('id', rateeId)
    .select('id, reputation_score, rating_count')
    .single();
  if (updateError) throw updateError;
  return updated;
}

function serializePublicProfile(profile) {
  if (!profile) return null;
  return {
    id: profile.id,
    name: profile.name,
    city: profile.city,
    avatar_url: profile.avatar_url,
    discord_username: profile.discord_username,
    verified: Boolean(profile.verified_at),
    reputation: publicReputation(profile),
    created_at: profile.created_at,
  };
}

module.exports = {
  applyRatingToReputation,
  serializePublicProfile,
  REPUTATION_DISPLAY_THRESHOLD,
};
