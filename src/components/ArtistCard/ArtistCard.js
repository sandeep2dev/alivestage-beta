import Link from 'next/link';
import { formatCityLabel } from '@/lib/cities';
import styles from './ArtistCard.module.css';

export default function ArtistCard({ artist }) {
  const profile = artist.profile || {};
  const genres = artist.genres || [];
  const cityLabel = formatCityLabel(artist.city) || '—';

  return (
    <Link href={`/artist/${artist.id}`} className={styles.card}>
      <div className={styles.avatarWrap}>
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt={profile.name} className={styles.avatar} />
        ) : (
          <div className={styles.avatarPlaceholder}>{profile.name?.[0] || 'A'}</div>
        )}
      </div>
      <div className={styles.body}>
        <h3 className={styles.name}>{profile.name}</h3>
        <p className={styles.city}>{cityLabel}</p>
        {genres.length > 0 && (
          <div className={styles.genres}>
            {genres.slice(0, 3).map((g) => (
              <span key={g} className={styles.genreTag}>{g}</span>
            ))}
          </div>
        )}
        <div className={styles.pricing}>
          <span>₹{Number(artist.hourly_rate).toLocaleString()}/hr</span>
          <span className={styles.minBooking}>Min ₹{Number(artist.min_booking_amount).toLocaleString()}</span>
        </div>
      </div>
    </Link>
  );
}
