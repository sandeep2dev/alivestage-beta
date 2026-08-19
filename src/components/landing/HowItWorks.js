'use client';

import { useInView } from './useInView';
import styles from './HowItWorks.module.css';

const JOIN_STEPS = [
  {
    num: '01',
    title: 'Browse the feed',
    desc: 'Discover upcoming jams in your city. See title, summary, schedule, and host — but not the exact address yet.',
  },
  {
    num: '02',
    title: 'Pay ₹10 to join',
    desc: "A small commitment fee unlocks the precise venue location. No approval step — pay and you're in.",
  },
  {
    num: '03',
    title: 'Show up & jam',
    desc: 'Head to the session, make music with your community, and rate fellow musicians after the jam ends.',
  },
];

const HOST_STEPS = [
  {
    num: '01',
    title: 'Create your jam',
    desc: 'Set title, description, spots, date, city, and pin the venue on a map. Pay ₹50 to publish.',
  },
  {
    num: '02',
    title: 'Fill your spots',
    desc: 'Musicians discover your jam in the feed. You manage attendance and can edit details before anyone joins.',
  },
  {
    num: '03',
    title: 'Mark complete',
    desc: 'After the session, mark it done. A rating window opens so everyone can build reputation together.',
  },
];

function StepList({ steps, label }) {
  return (
    <div className={styles.column}>
      <h3 className={styles.columnTitle}>{label}</h3>
      <ol className={styles.steps}>
        {steps.map((step, i) => (
          <li
            key={step.num}
            className={styles.step}
            style={{ transitionDelay: `${i * 0.1}s` }}
          >
            <span className={styles.num} aria-hidden="true">{step.num}</span>
            <div>
              <h4 className={styles.stepTitle}>{step.title}</h4>
              <p className={styles.stepDesc}>{step.desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function HowItWorks() {
  const [ref, inView] = useInView();

  return (
    <section
      id="how"
      ref={ref}
      className={`${styles.section} ${inView ? styles.inView : ''}`}
      aria-labelledby="how-heading"
    >
      <div className="container">
        <header className={styles.header}>
          <p className={styles.label}>How it works</p>
          <h2 id="how-heading" className={styles.title}>
            Two paths, one community
          </h2>
          <p className={styles.subtitle}>
            Whether you want to join a session or host one, the flow is simple and transparent.
          </p>
        </header>

        <div className={styles.columns}>
          <StepList steps={JOIN_STEPS} label="For joiners" />
          <StepList steps={HOST_STEPS} label="For hosts" />
        </div>
      </div>
    </section>
  );
}
