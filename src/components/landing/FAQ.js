'use client';

import { useState } from 'react';
import { useInView } from './useInView';
import styles from './FAQ.module.css';

const FAQS = [
  {
    q: 'Is Alivestage a gig booking platform?',
    a: 'No. Alivestage is a community jamming platform. It\'s for musicians who want to play together locally — not for hiring performers or booking paid gigs.',
  },
  {
    q: 'Why do I have to pay to join or host?',
    a: 'Small fees (₹10 to join, ₹50 to host) create commitment. They reduce spam listings and no-shows, so everyone who shows up is genuinely interested in jamming.',
  },
  {
    q: 'When do I get the exact venue address?',
    a: 'The city and summary are visible to everyone. The precise address is unlocked only after you pay the join fee — it\'s enforced server-side, not hidden in the UI.',
  },
  {
    q: 'What happens if the host cancels?',
    a: 'Joiners are notified by email. Join fees and the host\'s ₹50 creation fee are not refunded.',
  },
  {
    q: 'Can I leave a jam I already joined?',
    a: 'Yes. You can leave while the jam is still open. Your spot opens for someone else, but the join fee is not refunded.',
  },
  {
    q: 'How does reputation work?',
    a: 'After a jam is marked complete, attendees can rate each other during a 5-day window. Your public reputation score appears once you\'ve received 10 or more ratings.',
  },
  {
    q: 'Do I need to sign in to browse?',
    a: 'No. You can browse the feed immediately. Sign in with email OTP when you\'re ready to host or join a jam.',
  },
];

export default function FAQ() {
  const [ref, inView] = useInView();
  const [openIndex, setOpenIndex] = useState(null);

  function toggle(i) {
    setOpenIndex(openIndex === i ? null : i);
  }

  return (
    <section
      ref={ref}
      className={`${styles.section} ${inView ? styles.inView : ''}`}
      aria-labelledby="faq-heading"
    >
      <div className="container">
        <header className={styles.header}>
          <p className={styles.label}>FAQ</p>
          <h2 id="faq-heading" className={styles.title}>
            Common questions
          </h2>
        </header>

        <div className={styles.list}>
          {FAQS.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={faq.q}
                className={`${styles.item} ${isOpen ? styles.open : ''}`}
                style={{ transitionDelay: `${0.05 * i}s` }}
              >
                <button
                  type="button"
                  className={styles.question}
                  onClick={() => toggle(i)}
                  aria-expanded={isOpen}
                >
                  <span>{faq.q}</span>
                  <span className={styles.icon} aria-hidden="true" />
                </button>
                <div className={styles.answerWrap} aria-hidden={!isOpen}>
                  <div className={styles.answerInner}>
                    <p className={styles.answer}>{faq.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
