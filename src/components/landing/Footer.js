import Link from 'next/link';
import Logo from '@/components/Logo/Logo';
import styles from './Footer.module.css';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <Logo variant="full" href="/" size="lg" />
            <p className={styles.tagline}>
              Community jamming for musicians in India. Find your people. Play together.
            </p>
          </div>

          <nav className={styles.nav} aria-label="Footer">
            <div className={styles.navGroup}>
              <h3 className={styles.navTitle}>Platform</h3>
              <ul className={styles.navList}>
                <li><Link href="/events">Browse jams</Link></li>
                <li><Link href="/events/new">Host a jam</Link></li>
                <li><Link href="/my-events">My jams</Link></li>
                <li><Link href="/profile">Profile</Link></li>
              </ul>
            </div>

            <div className={styles.navGroup}>
              <h3 className={styles.navTitle}>Account</h3>
              <ul className={styles.navList}>
                <li><Link href="/auth">Sign in</Link></li>
                <li><Link href="/onboarding">Get started</Link></li>
              </ul>
            </div>

            <div className={`${styles.navGroup} ${styles.legalNavGroup}`}>
              <h3 className={styles.navTitle}>Legal</h3>
              <ul className={styles.navList}>
                <li><Link href="/guidelines">Community Guidelines</Link></li>
                <li><Link href="/terms">Terms &amp; Conditions</Link></li>
                <li><Link href="/privacy">Privacy Policy</Link></li>
                <li><Link href="/refund-policy">Refund &amp; Cancellation</Link></li>
              </ul>
            </div>
          </nav>
        </div>

        <div className={styles.bottom}>
          <p className={styles.copy}>
            © {year} Alivestage. Built for local music communities.
          </p>
          <p className={styles.fees}>
            Join ₹50 · Host ₹200 · Full refund on host cancel
          </p>
        </div>
      </div>
    </footer>
  );
}
