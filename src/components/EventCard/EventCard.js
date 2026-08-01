import Link from 'next/link';
import EventStatusBadge, { RoleBadge } from '@/components/EventStatusBadge/EventStatusBadge';
import { formatEventWhen, formatSpotsRemaining } from '@/lib/eventUi';
import styles from './EventCard.module.css';

export default function EventCard({ event, variant = 'feed' }) {
  const href = `/events/${event.id}`;
  const showHosting = event.is_host;
  const showJoined = event.is_member && !event.is_host;

  return (
    <Link href={href} className={styles.card}>
      <div className={styles.cardTop}>
        <div className={styles.badges}>
          <EventStatusBadge status={event.display_status || event.status} />
          {showJoined && <RoleBadge label="Joined" />}
          {showHosting && <RoleBadge label="Hosting" variant="hosting" />}
        </div>
        <span className={styles.city}>{event.city}</span>
      </div>
      <h2 className={styles.title}>{event.title}</h2>
      {variant === 'feed' && event.summary && (
        <p className={styles.summary}>{event.summary}</p>
      )}
      <div className={styles.meta}>
        <span>{formatEventWhen(event.start_at, { weekday: variant === 'feed' })}</span>
        {event.duration_minutes != null && <span>{event.duration_minutes} min</span>}
        {formatSpotsRemaining(event) && (
          <span className={event.is_full ? styles.spotsFull : styles.spots}>
            {formatSpotsRemaining(event)}
          </span>
        )}
        {variant === 'feed' && event.host?.name && <span>Host: {event.host.name}</span>}
      </div>
    </Link>
  );
}
