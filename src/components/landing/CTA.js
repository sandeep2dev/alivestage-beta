'use client';

import Link from 'next/link';
import { useInView } from './useInView';
import { useAuth } from '@/contexts/AuthContext';
import styles from './CTA.module.css';

export default function CTA() {
  const [ref, inView] = useInView();
  const { openAuth } = useAuth();

  return (
    <section
      ref={ref}
      className={`${styles.section} ${inView ? styles.inView : ''}`}
      aria-labelledby="cta-heading"
    >
      <div className="container">
        <div className={styles.card}>
          <div className={styles.glow} aria-hidden="true" />
          <h2 id="cta-heading" className={styles.title}>
            Ready to find your next jam?
          </h2>
          <p className={styles.subtitle}>
            Browse sessions in your city or host your own. It takes less than five minutes to get started.
          </p>
          <div className={styles.actions}>
            <Link href="/events" className={`btn btnPrimary ${styles.btn}`}>
              Browse jams
            </Link>
            <Link href="/events/new" className={`btn btnSecondary ${styles.btn}`}>
              Host a jam
            </Link>
            <button type="button" className={`btn btnSecondary ${styles.btnGhost}`} onClick={() => openAuth()}>
              Sign in
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
