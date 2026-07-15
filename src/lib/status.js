export function statusClass(status) {
  const map = {
    pending: 'statusPending',
    confirmed: 'statusConfirmed',
    completed_by_fan: 'statusCompleted',
    rejected: 'statusRejected',
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
  return String(status).replace(/_/g, ' ');
}

export function paymentTypeLabel(type) {
  const map = {
    token: 'Token',
    balance: 'Balance',
  };
  return map[type] || String(type || '').replace(/_/g, ' ');
}
