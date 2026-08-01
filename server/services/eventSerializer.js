/**
 * Serialize an event for API responses.
 * precise_address is only included for host or active (non-cancelled) members.
 */
const { REPUTATION_DISPLAY_THRESHOLD } = require('../config/community');

function eventHasEnded(event) {
  if (!event?.end_at) return false;
  return new Date(event.end_at).getTime() < Date.now();
}

function eventHasStarted(event) {
  if (!event?.start_at) return false;
  return new Date(event.start_at).getTime() <= Date.now();
}

/**
 * User-facing status label (DB status stays created|live|completed|cancelled).
 * Time-based (does not require host go-live / complete):
 * - before start_at → Upcoming
 * - start_at..end_at → Live
 * - after end_at → Past (joiners / public) or Ended (host, until marked completed)
 * - completed → Past, cancelled → Cancelled
 */
function displayStatus(event, { isMember = false, isHost = false } = {}) {
  if (!event) return null;
  if (event.status === 'cancelled') return 'Cancelled';
  if (event.status === 'completed') return 'Past';

  const ended = eventHasEnded(event);
  if (ended && isMember && !isHost) return 'Past';
  if (ended && isHost) return 'Ended';
  if (ended) return 'Past';

  if (eventHasStarted(event) || event.status === 'live') return 'Live';
  return 'Upcoming';
}

function serializeEvent(
  event,
  { viewerId = null, isMember = false, hostProfile = null, memberCount = null } = {}
) {
  if (!event) return null;

  const isHost = Boolean(viewerId && event.host_id === viewerId);
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
    display_status: displayStatus(event, { isMember, isHost }),
    has_started: eventHasStarted(event),
    has_ended: eventHasEnded(event),
    completed_at: event.completed_at || null,
    rating_window_closes_at: event.rating_window_closes_at || null,
    created_at: event.created_at,
    host,
    is_host: isHost,
    is_member: Boolean(isMember),
    max_spots: Number(event.max_spots) || 0,
  };

  if (memberCount != null) {
    const count = Number(memberCount) || 0;
    const max = Number(event.max_spots) || 0;
    base.member_count = count;
    base.spots_remaining = Math.max(0, max - count);
    base.is_full = count >= max;
  }

  if (canSeeAddress) {
    base.precise_address = event.precise_address;
    if (event.venue_lat != null && event.venue_lng != null) {
      base.venue_lat = Number(event.venue_lat);
      base.venue_lng = Number(event.venue_lng);
    }
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

module.exports = {
  serializeEvent,
  publicReputation,
  displayStatus,
  eventHasEnded,
  eventHasStarted,
};
