'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import styles from './Hero.module.css';

const BAR_HEIGHTS = [40, 70, 100, 55, 85];
const BAR_DELAYS = [0, 0.15, 0.3, 0.45, 0.6];

export default function Hero() {
  const { openAuth } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  function scrollToHow() {
    document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <section className={styles.hero} aria-label="Welcome">
      <div className={styles.bg}>
        <div className={styles.orb1} aria-hidden="true" />
        <div className={styles.orb2} aria-hidden="true" />
        <div className={styles.orb3} aria-hidden="true" />
        <div className={styles.grid} aria-hidden="true" />
      </div>

      <div className={`container ${styles.inner}`}>
        <div className={`${styles.content} ${mounted ? styles.visible : ''}`}>
          <div className={styles.equalizerWrap} aria-hidden="true">
            <svg
              className={styles.equalizer}
              viewBox="0 0 120 120"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g transform="rotate(-9 60 60)">
                {BAR_HEIGHTS.map((h, i) => (
                  <rect
                    key={i}
                    className={styles.bar}
                    x={12 + i * 22}
                    y={60 - h / 2}
                    width="12"
                    height={h}
                    rx="6"
                    style={{ animationDelay: `${BAR_DELAYS[i]}s` }}
                  />
                ))}
              </g>
            </svg>
            <div className={styles.glow} aria-hidden="true" />
          </div>

          <p className={styles.eyebrow}>Community jamming platform</p>

          <h1 className={styles.headline}>
            <span className={styles.line}>Find your people.</span>
            <span className={`${styles.line} ${styles.accent}`}>Play together.</span>
          </h1>

          <p className={styles.subhead}>
            Alivestage connects musicians across India for real, in-person jam sessions —
            not gigs, not bookings. Just music, community, and commitment.
          </p>

          <div className={styles.actions}>
            <Link href="/events" className={`btn btnPrimary ${styles.cta}`}>
              Browse jams
            </Link>
            <Link href="/events/new" className={`btn btnSecondary ${styles.cta}`}>
              Host a jam
            </Link>
            <button
              type="button"
              className={`btn btnSecondary ${styles.ctaGhost}`}
              onClick={() => openAuth()}
            >
              Sign in
            </button>
          </div>

          {/* <div className={styles.trust}>
            <span>₹50 to join</span>
            <span className={styles.dot} aria-hidden="true" />
            <span>₹200 to host</span>
            <span className={styles.dot} aria-hidden="true" />
            <span>Address unlocked after join</span>
          </div> */}
        </div>
      </div>

      <button
        type="button"
        className={styles.scrollHint}
        onClick={scrollToHow}
        aria-label="Scroll to how it works"
      >
        <span className={styles.scrollChevron} aria-hidden="true" />
      </button>
    </section>
  );
}
