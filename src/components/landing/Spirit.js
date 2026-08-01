'use client';

import { useInView } from './useInView';
import styles from './Spirit.module.css';

const VALUES = [
  {
    title: 'Community over commerce',
    desc: 'No gig marketplace, no escrow, no payouts. Alivestage exists so musicians can jam together — not transact.',
  },
  {
    title: 'Skin in the game',
    desc: "Small fees reduce spam and no-shows. When you pay to join, you're saying you'll show up. When you host, you're invested in making it happen.",
  },
  {
    title: 'Privacy by design',
    desc: "City and summary are public. The exact address stays server-gated until you've committed with a join payment.",
  },
  {
    title: 'Honest attendance',
    desc: "Hosts mark who actually attended. That's what drives ratings — not self-reported check-ins or vanity metrics.",
  },
  {
    title: 'Reputation without punishment',
    desc: 'Your score goes public after 10 ratings. No penalty for unrated attendees. Build trust slowly, earn it fairly.',
  },
  {
    title: 'Explicit rules',
    desc: 'Refunds, cancellations, and event lifecycles are documented and enforced. No surprises, no grey areas.',
  },
];

export default function Spirit() {
  const [ref, inView] = useInView();

  return (
    <section
      ref={ref}
      className={`${styles.section} ${inView ? styles.inView : ''}`}
      aria-labelledby="spirit-heading"
    >
      <div className="container">
        <div className={styles.layout}>
          <div className={styles.sticky}>
            <p className={styles.label}>Core spirit</p>
            <h2 id="spirit-heading" className={styles.title}>
              Music is better when everyone commits
            </h2>
            <p className={styles.lead}>
              Alivestage is built on a simple belief: local music scenes thrive when people
              show up, respect each other's time, and play together in real rooms.
            </p>
          </div>

          <ul className={styles.values}>
            {VALUES.map((value, i) => (
              <li
                key={value.title}
                className={styles.value}
                style={{ transitionDelay: `${0.06 * i}s` }}
              >
                <h3 className={styles.valueTitle}>{value.title}</h3>
                <p className={styles.valueDesc}>{value.desc}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
