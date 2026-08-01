'use client';

import { useInView } from './useInView';
import styles from './About.module.css';

export default function About() {
  const [ref, inView] = useInView();

  return (
    <section
      ref={ref}
      className={`${styles.section} ${inView ? styles.inView : ''}`}
      aria-labelledby="about-heading"
    >
      <div className="container">
        <div className={styles.grid}>
          <div className={styles.copy}>
            <p className={styles.label}>What is Alivestage</p>
            <h2 id="about-heading" className={styles.title}>
              A home for local musicians who want to jam — not perform for hire
            </h2>
            <p className={styles.body}>
              Alivestage is a community jamming platform built for India. Browse upcoming
              sessions in your city, pay a small fee to join, and get the exact venue address.
              Host your own jam, fill spots with committed musicians, and build a reputation
              that follows you.
            </p>
            <p className={styles.body}>
              This is not a booking marketplace. There are no gigs, no escrow, no payouts.
              Just real people making music together in real rooms — with enough skin in
              the game to keep things honest.
            </p>
          </div>

          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>₹50</span>
              <span className={styles.statLabel}>Join fee — unlocks the venue address</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>₹200</span>
              <span className={styles.statLabel}>Host fee — publish your jam to the feed</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>Local</span>
              <span className={styles.statLabel}>City-first feed sorted near you</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
