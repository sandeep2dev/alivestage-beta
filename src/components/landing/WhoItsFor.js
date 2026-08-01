'use client';

import { useInView } from './useInView';
import styles from './WhoItsFor.module.css';

const PERSONAS = [
  {
    icon: '🎸',
    title: 'Session musicians',
    desc: 'You play for the love of it. You want to find other musicians nearby for casual jams — not auditions or paid gigs.',
  },
  {
    icon: '🎤',
    title: 'Jam hosts',
    desc: 'You have a space, a vision, or just energy to bring people together. Host a session, set the vibe, and build your local scene.',
  },
  {
    icon: '🎹',
    title: 'Weekend explorers',
    desc: "You're curious, maybe learning an instrument, and want a low-pressure way to play with others in your city.",
  },
  {
    icon: '🥁',
    title: 'Community builders',
    desc: 'You care about local music culture. Alivestage gives you a structured way to grow a scene with accountability built in.',
  },
];

export default function WhoItsFor() {
  const [ref, inView] = useInView();

  return (
    <section
      ref={ref}
      className={`${styles.section} ${inView ? styles.inView : ''}`}
      aria-labelledby="who-heading"
    >
      <div className="container">
        <header className={styles.header}>
          <p className={styles.label}>Built for</p>
          <h2 id="who-heading" className={styles.title}>
            Musicians who show up
          </h2>
          <p className={styles.subtitle}>
            Alivestage is for anyone in India who wants real, in-person musical connection —
            not another algorithm feed or gig marketplace.
          </p>
        </header>

        <div className={styles.grid}>
          {PERSONAS.map((persona, i) => (
            <article
              key={persona.title}
              className={styles.card}
              style={{ transitionDelay: `${0.08 * i}s` }}
            >
              <span className={styles.icon} aria-hidden="true">{persona.icon}</span>
              <h3 className={styles.cardTitle}>{persona.title}</h3>
              <p className={styles.cardDesc}>{persona.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
