/** Map display_status labels to global statusBadge classes */
export function statusBadgeClass(displayStatus) {
  const label = String(displayStatus || '').toLowerCase();
  if (label === 'live') return 'statusConfirmed';
  if (label === 'upcoming') return 'statusPending';
  if (label === 'past' || label === 'ended') return 'statusCompleted';
  if (label === 'cancelled') return 'statusCancelled';
  return 'statusPending';
}

export function formatSpotsRemaining(event) {
  if (event?.spots_remaining == null || event?.max_spots == null) return null;
  if (event.is_full) return 'Full';
  const n = event.spots_remaining;
  return `${n} spot${n === 1 ? '' : 's'} left`;
}

export function formatSpotsSummary(event) {
  if (event?.max_spots == null || event?.member_count == null) return null;
  if (event.is_full) return `Full · ${event.max_spots} spots`;
  return `${event.spots_remaining} of ${event.max_spots} spots left`;
}

export function formatEventWhen(iso, { weekday = true } = {}) {
  try {
    const opts = weekday
      ? {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }
      : {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        };
    return new Date(iso).toLocaleString(undefined, opts);
  } catch {
    return iso;
  }
}
