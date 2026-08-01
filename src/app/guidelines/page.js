import Link from 'next/link';
import Footer from '@/components/landing/Footer';
import styles from '@/styles/legal.module.css';

export const metadata = {
  title: 'Community Guidelines',
  description: 'How we look out for each other on Alivestage — show up, be honest, play fair.',
};

const CONTACT_EMAIL = 'sandeep@alivestage.com';
const RATING_WINDOW_DAYS = 5;
const REPUTATION_THRESHOLD = 10;

export default function GuidelinesPage() {
  return (
    <>
      <div className={`container ${styles.page}`}>
        <header className={styles.header}>
          <h1 className="pageTitle">Community Guidelines</h1>
          <p className="pageSubtitle">
            Alivestage works when musicians show up, respect each other&apos;s time and space, and
            play in good faith. These are the house rules — for every jam, in every city.
          </p>
        </header>

        <article className={`${styles.content} ${styles.guidelines}`}>
          <div className={styles.highlight}>
            <p>
              This isn&apos;t a gig marketplace or a managed venue network. It&apos;s people hosting
              other people in real rooms. We facilitate listings and payments — we don&apos;t
              supervise sessions. That makes <strong>how we treat each other</strong> the whole
              point.
            </p>
          </div>

          <h2>Show up — or say you can&apos;t</h2>
          <p>
            When you pay ₹50 to join, you&apos;re telling the host and everyone else that you plan
            to be there. No-shows waste a spot someone else could have taken and mess with a host
            who may have cleared time and space for you.
          </p>
          <ul>
            <li>
              <strong>If you&apos;re in, be in.</strong> Block the time. Read the jam details before
              you pay.
            </li>
            <li>
              <strong>If plans change, leave through the app</strong> while the jam is still open.
              You&apos;ll get a 50% refund (₹25) and your spot opens up. See our{' '}
              <Link href="/refund-policy">Refund Policy</Link> for details.
            </li>
            <li>
              <strong>Don&apos;t ghost.</strong> Silence after paying is the fastest way to lose
              trust in this community.
            </li>
          </ul>

          <h2>Respect the host&apos;s space and their rules</h2>
          <p>
            A jam might be in someone&apos;s home, a rehearsal room, or a studio they&apos;re
            paying for. You&apos;re a guest in their space.
          </p>
          <p>
            Hosts set the vibe in their listing — the <strong>summary</strong> on the feed and the
            full <strong>description</strong> on the jam page. That&apos;s where they&apos;ll say
            things like genre, skill level, what to bring, or whether it&apos;s beginners-only.
            There are no separate &ldquo;rules&rdquo; fields — read the listing carefully before you
            join.
          </p>
          <ul>
            <li>Only join jams that actually fit you — skill, genre, gear, and intent.</li>
            <li>Follow any house rules the host has written in their listing.</li>
            <li>Don&apos;t share the exact venue address publicly — it unlocks only after you join.</li>
            <li>Leave the space as you found it. Be decent about noise, gear, and other people&apos;s equipment.</li>
          </ul>

          <h2>Be honest about who you are and why you&apos;re joining</h2>
          <p>
            We don&apos;t run background checks or audition you before you join. Sign-in is email
            only — there&apos;s no phone verification or identity vetting beyond that and your
            payment. That means <strong>honesty is on you</strong>.
          </p>
          <ul>
            <li>
              Keep your profile accurate — name, city, and the basics you share with the community.
            </li>
            <li>
              Don&apos;t misrepresent your skill level or intent to get into a jam that isn&apos;t
              meant for you.
            </li>
            <li>
              Don&apos;t use Alivestage to sell services, spam listings, or run unrelated events.
            </li>
          </ul>

          <h2>Zero tolerance for the serious stuff</h2>
          <p>These will get you removed — no debate:</p>
          <ul>
            <li>Harassment, hate, threats, or unwanted sexual behaviour</li>
            <li>Violence, theft, or putting others in unsafe situations</li>
            <li>Showing up impaired in a way that endangers people or gear</li>
            <li>Deliberate misrepresentation to gain access to someone&apos;s private address</li>
            <li>Abusing refunds, payments, or the platform to harm hosts or joiners</li>
          </ul>
          <p>
            If something feels off at a jam, prioritize your safety first — leave if you need to.
            Then tell us.
          </p>

          <h2>How to report a problem</h2>
          <p>
            There isn&apos;t a separate &ldquo;report this user&rdquo; button yet. If something
            went wrong at a jam or with another member, reach out:
          </p>
          <ul>
            <li>
              <strong>In the app:</strong> open <strong>Help</strong> from the menu (you need to be
              signed in), describe what happened, and include the jam name and date if you can.
            </li>
            <li>
              <strong>By email:</strong>{' '}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> — same details help us
              investigate faster.
            </li>
          </ul>
          <p>What we may do after reviewing a report:</p>
          <ul>
            <li>
              <strong>Remove you from a specific jam</strong> — an admin can cancel your membership.
              Your join fee is not refunded in violation cases. Your membership is soft-deleted
              (marked cancelled) but stays on record.
            </li>
            <li>
              <strong>Suspend your account</strong> — for serious or repeated issues. You won&apos;t
              be able to sign in until we review an appeal.
            </li>
            <li>
              <strong>Cancel an entire jam</strong> — if the host is the problem, joiners get a full
              refund.
            </li>
          </ul>
          <div className={styles.highlight}>
            <p>
              <strong>Why we keep payment and event records:</strong> When a membership is cancelled
              or someone is removed, we don&apos;t erase the transaction trail. Your payment ID,
              refund status, and jam association stay on file. That protects everyone if there&apos;s
              a dispute, a refund question, or a safety concern down the line. Removal ends your
              access — it doesn&apos;t wipe the history.
            </p>
          </div>

          <h2>How ratings work — and why they matter</h2>
          <p>
            After a jam, the host marks who actually attended. That&apos;s the only attendance
            count that matters — not self check-ins.
          </p>
          <p>
            Once the host marks the jam complete, a <strong>{RATING_WINDOW_DAYS}-day rating window</strong>{' '}
            opens. Only people marked attended can rate:
          </p>
          <ul>
            <li>Attended joiners can rate the host</li>
            <li>The host can rate attended joiners</li>
            <li>Attended joiners can rate other attended joiners</li>
          </ul>
          <p>
            You can&apos;t rate yourself, and you can only rate someone once per jam. Scores are
            1–5. Your public reputation score appears on your profile after you&apos;ve received{' '}
            <strong>{REPUTATION_THRESHOLD} or more ratings</strong> — until then, we&apos;re still
            learning, and so is everyone else.
          </p>
          <p>
            Ratings aren&apos;t punishment for skipping them. They&apos;re how the community builds
            trust over time — especially when you&apos;re meeting strangers in someone&apos;s space.
          </p>

          <h2>What gets you removed from Alivestage</h2>
          <p>We may suspend or ban your account if you:</p>
          <ul>
            <li>Break these guidelines or our <Link href="/terms">Terms</Link></li>
            <li>No-show repeatedly or abuse the join/leave system</li>
            <li>Harass, threaten, or endanger other members</li>
            <li>Lie about who you are or why you&apos;re joining</li>
            <li>Try to bypass address gating or payment rules</li>
          </ul>
          <p>
            A ban blocks you from signing in. It does <strong>not</strong> delete your payment
            history or past jam records — those stay on file, as described above.
          </p>
          <p>
            Think it was a mistake? Email{' '}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with &ldquo;Account
            appeal&rdquo; in the subject line.
          </p>

          <h2>Every jam, every city</h2>
          <p>
            Whether it&apos;s a blues night in Mumbai, a bedroom acoustic circle in Pune, or a
            synth experiment in Bengaluru — these guidelines apply. Genre and city change; the
            expectation doesn&apos;t: <strong>show up in good faith, respect the room, and don&apos;t
            make it harder for the rest of us to play together.</strong>
          </p>
          <p>
            For the legal fine print, see our{' '}
            <Link href="/terms">Terms &amp; Conditions</Link>,{' '}
            <Link href="/privacy">Privacy Policy</Link>, and{' '}
            <Link href="/refund-policy">Refund &amp; Cancellation Policy</Link>.
          </p>
        </article>
      </div>

      <div className={styles.footerWrap}>
        <Footer />
      </div>
    </>
  );
}
