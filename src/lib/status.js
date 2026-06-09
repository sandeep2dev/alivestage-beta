export function statusClass(status) {
  const map = {
    pending: 'statusPending',
    confirmed: 'statusConfirmed',
    completed_by_fan: 'statusCompleted',
    rejected: 'statusRejected',
    settled: 'statusSettled',
    cancelled: 'statusCancelled',
  };
  return map[status] || 'statusCancelled';
}

export function statusLabel(status) {
  return String(status).replace(/_/g, ' ');
}
