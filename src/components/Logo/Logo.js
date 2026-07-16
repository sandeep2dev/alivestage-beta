'use client';

import Link from 'next/link';
import styles from './Logo.module.css';

/**
 * Alivestage logo — icon always; wordmark text when variant="full".
 *
 * @param {'full' | 'icon'} [variant='full']
 * @param {string} [href]
 * @param {'sm' | 'md' | 'lg'} [size='md']
 * @param {string} [className]
 * @param {string} [title='Alivestage']
 * @param {(e: any) => void} [onClick]
 */
export default function Logo({
  variant = 'full',
  href,
  size = 'md',
  className = '',
  title = 'Alivestage',
  onClick,
}) {
  const showWordmark = variant === 'full';

  const classes = [
    styles.logo,
    styles[variant],
    styles[size],
    className,
  ].filter(Boolean).join(' ');

  const mark = (
    <span className={classes}>
      <svg className={styles.icon} width="32" height="32" viewBox="0 0 165 165" xmlns="http://www.w3.org/2000/svg" role="img">
        <title>AliveStage icon mark</title>
        <desc>Icon-only version of the AliveStage mark: five equalizer bars of varying height, tilted 9 degrees, in amber.</desc>

        <g xmlns="http://www.w3.org/2000/svg" transform="translate(-34,-27)">
          <g transform="rotate(-9 110 110)">
            <rect x="54" y="90" width="14" height="40" rx="7" fill="#FF6B35" />
            <rect x="80" y="60" width="14" height="100" rx="7" fill="#FF6B35" />
            <rect x="106" y="30" width="14" height="160" rx="7" fill="#FF6B35" />
            <rect x="132" y="75" width="14" height="70" rx="7" fill="#FF6B35" />
            <rect x="158" y="45" width="14" height="130" rx="7" fill="#FF6B35" />
          </g>
        </g>
      </svg>

      {showWordmark && <span className={styles.wordmark}>{title}</span>}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className={styles.link} onClick={onClick} aria-label={title}>
        {mark}
      </Link>
    );
  }

  return (
    <span role="img" aria-label={title}>
      {mark}
    </span>
  );
}
