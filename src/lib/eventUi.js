/** Map display_status labels to global statusBadge classes */
export function statusBadgeClass(displayStatus) {
  const label = String(displayStatus || '').toLowerCase();
  if (label === 'live') return 'statusConfirmed';
  if (label === 'upcoming') return 'statusPending';
  if (label === 'past' || label === 'ended') return 'statusCompleted';
  if (label === 'cancelled') return 'statusCancelled';
  return 'statusPending';
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
