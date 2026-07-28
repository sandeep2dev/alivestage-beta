import styles from './Skeleton.module.css';

export function SkeletonLine({ width = '100%', className = '' }) {
  return (
    <span
      className={`${styles.line} ${className}`.trim()}
      style={{ width }}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className={styles.card} aria-hidden="true">
      <SkeletonLine width="30%" />
      <SkeletonLine width="70%" className={styles.title} />
      {Array.from({ length: lines - 2 }).map((_, i) => (
        <SkeletonLine key={i} width={i === 0 ? '90%' : '50%'} />
      ))}
    </div>
  );
}

export function SkeletonList({ count = 3 }) {
  return (
    <div className={styles.list} aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
