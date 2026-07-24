/**
 * Serialize an event for API responses.
 * precise_address is only included for host or active (non-cancelled) members.
 */
const { REPUTATION_DISPLAY_THRESHOLD } = require('../config/community');

function serializeEvent(event, { viewerId = null, isMember = false, hostProfile = null } = {}) {
  if (!event) return null;

  const isHost = viewerId && event.host_id === viewerId;
  const canSeeAddress = Boolean(isHost || isMember);

  const host = hostProfile
    ? {
        id: hostProfile.id,
        name: hostProfile.name,
        city: hostProfile.city,
        avatar_url: hostProfile.avatar_url,
        reputation: publicReputation(hostProfile),
      }
    : null;

  const base = {
    id: event.id,
    host_id: event.host_id,
    title: event.title,
    summary: event.summary,
    description: event.description,
    city: event.city,
    start_at: event.start_at,
    duration_minutes: event.duration_minutes,
    end_at: event.end_at,
    visibility: event.visibility,
    status: event.status,
    completed_at: event.completed_at || null,
    rating_window_closes_at: event.rating_window_closes_at || null,
    created_at: event.created_at,
    host,
    is_host: Boolean(isHost),
    is_member: Boolean(isMember),
  };

  if (canSeeAddress) {
    base.precise_address = event.precise_address;
  }

  return base;
}

function publicReputation(profile) {
  const count = Number(profile?.rating_count || 0);
  if (count < REPUTATION_DISPLAY_THRESHOLD) {
    return { display: null, rating_count: count, enough: false };
  }
  return {
    display: Number(profile.reputation_score),
    rating_count: count,
    enough: true,
  };
}

module.exports = { serializeEvent, publicReputation };
