import { statusBadgeClass } from '@/lib/eventUi';
import styles from './EventStatusBadge.module.css';

export default function EventStatusBadge({ status, className = '' }) {
  if (!status) return null;
  const tone = statusBadgeClass(status);
  return (
    <span className={`statusBadge ${tone} ${styles.badge} ${className}`.trim()}>
      {status}
    </span>
  );
}

export function RoleBadge({ label, variant = 'joined' }) {
  const tone = variant === 'hosting' ? 'statusCompleted' : 'statusConfirmed';
  return (
    <span className={`statusBadge ${tone} ${styles.badge} ${styles.role}`.trim()}>
      {label}
    </span>
  );
}
