export function statusClass(status) {
  const map = {
    requested: 'statusPending',
    awaiting_token: 'statusPending',
    pending: 'statusPending',
    confirmed: 'statusConfirmed',
    completed_by_fan: 'statusCompleted',
    rejected: 'statusRejected',
    declined: 'statusRejected',
    settled: 'statusSettled',
    cancelled: 'statusCancelled',
    token_paid: 'statusConfirmed',
    fully_paid: 'statusCompleted',
    refunded: 'statusRejected',
    released_to_artist: 'statusSettled',
  };
  return map[status] || 'statusCancelled';
}

export function statusLabel(status) {
  const map = {
    requested: 'Awaiting artist',
    awaiting_token: 'Pay Alivestage fee',
    declined: 'Declined',
  };
  if (map[status]) return map[status];
  return String(status).replace(/_/g, ' ');
}

export function paymentTypeLabel(type) {
  const map = {
    token: 'Alivestage fee',
    balance: 'Balance',
  };
  return map[type] || String(type || '').replace(/_/g, ' ');
}
