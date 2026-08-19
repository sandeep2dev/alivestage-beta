import Link from 'next/link';
import Footer from '@/components/landing/Footer';
import styles from '@/styles/legal.module.css';

export const metadata = {
  title: 'Terms & Conditions',
  description: 'Terms of use for Alivestage — the community jamming platform for musicians in India.',
};

const CONTACT_EMAIL = 'sandeep@alivestage.com';
const OPERATOR_NAME = 'Sandeep Kumawat';
const EFFECTIVE_DATE = '1 August 2026';
/** Courts of exclusive jurisdiction */
const JURISDICTION = 'Udaipur, Rajasthan';

const HOST_FEE = 50;
const JOIN_FEE = 10;
const MIN_AGE = 18;

export default function TermsPage() {
  return (
    <>
      <div className={`container ${styles.page}`}>
        <header className={styles.header}>
          <h1 className="pageTitle">Terms &amp; Conditions</h1>
          <p className="pageSubtitle">
            The rules for using Alivestage to discover, host, and join local musician jams.
          </p>
          <p className={styles.updated}>Effective {EFFECTIVE_DATE}</p>
        </header>

        <article className={styles.content}>
          <h2>1. Who operates Alivestage</h2>
          <p>
            Alivestage is a community jamming platform operated by <strong>{OPERATOR_NAME}</strong>,
            an individual based in Udaipur, Rajasthan, India — not a registered company, partnership,
            or limited liability entity. In these Terms, &ldquo;Alivestage&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;,
            and &ldquo;our&rdquo; refer to this individual operator and the Alivestage service.
          </p>
          <p>
            Contact:{' '}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </p>

          <h2>2. What Alivestage is — and is not</h2>
          <p>
            Alivestage is a <strong>peer-to-peer facilitation platform</strong> for musicians who
            want to find, host, and join informal jam sessions in their city. We provide:
          </p>
          <ul>
            <li>A public feed to discover upcoming jams</li>
            <li>Tools to create jam listings and collect a small host fee</li>
            <li>A join flow with payment, after which the precise venue address is unlocked</li>
            <li>Attendance marking and post-jam ratings to build community reputation</li>
          </ul>
          <div className={styles.highlight}>
            <p>
              <strong>Alivestage does not organize, produce, supervise, vet, or insure any jam session.</strong>{' '}
              We are not an event organizer, venue operator, employer, agent, or guarantor. Hosts and
              joiners arrange and attend sessions directly with each other. We do not verify musical
              ability, identity beyond email, venue safety, or the accuracy of listings beyond what
              the platform displays.
            </p>
          </div>
          <p>
            Any jam you host or attend is at your own risk and discretion. Alivestage&apos;s role is
            limited to listing, payment collection for platform fees, and the features described in
            these Terms.
          </p>

          <h2>3. How the service works</h2>
          <p>The typical flow is:</p>
          <ol>
            <li>
              <strong>Sign up</strong> — email one-time passcode, then complete onboarding with
              display name, city, and pincode.
            </li>
            <li>
              <strong>Browse</strong> — view upcoming jams (city, summary, schedule, host). Exact
              venue addresses are hidden until you join.
            </li>
            <li>
              <strong>Host a jam</strong> — pay the ₹{HOST_FEE} host create fee via Razorpay. Your
              jam is published. You set the venue address, which remains gated until someone pays to
              join.
            </li>
            <li>
              <strong>Join a jam</strong> — pay the ₹{JOIN_FEE} join fee via Razorpay. Your membership
              is created and the precise address is unlocked for you.
            </li>
            <li>
              <strong>Attend</strong> — you and other participants meet at the venue independently.
              The host marks who attended after the jam.
            </li>
            <li>
              <strong>Rate</strong> — after the host marks the jam complete, attended members may
              rate each other within a 5-day window. Public reputation scores appear after 10 or
              more ratings.
            </li>
          </ol>
          <p>
            Refunds and cancellations follow our{' '}
            <Link href="/refund-policy">Refund &amp; Cancellation Policy</Link>, which is
            incorporated into these Terms by reference.
          </p>

          <h2>4. Eligibility</h2>
          <p>
            You must be at least <strong>{MIN_AGE} years old</strong> to create an account, host a
            jam, or join a jam. By using Alivestage, you represent that you meet this age requirement.
            The platform involves online payments and sharing of private venue addresses — we do not
            permit use by minors.
          </p>
          <p>
            You must provide accurate information during onboarding and keep your profile reasonably
            up to date. You may only maintain one account per person.
          </p>

          <h2 id="community-conduct">5. Your obligations</h2>
          <p>When you use Alivestage, you agree to:</p>
          <ul>
            <li>
              Provide <strong>accurate profile information</strong> — your display name, city, and
              pincode should reflect who and where you are.
            </li>
            <li>
              <strong>Host in good faith</strong> — if you pay to create a jam, you intend to hold
              it at the listed time and place (or cancel through the app if plans change).
            </li>
            <li>
              <strong>Join in good faith</strong> — if you pay to join, you intend to attend. The
              join fee exists to reduce no-shows and spam.
            </li>
            <li>
              Treat other users with respect — no harassment, discrimination, theft, violence,
              misrepresentation, or behaviour that puts others at risk.
            </li>
            <li>
              Not use Alivestage for commercial gig booking, ticket resale, unrelated advertising,
              or any unlawful purpose.
            </li>
            <li>
              Not share a jam&apos;s precise venue address publicly before or outside the platform&apos;s
              intended use (i.e. do not post gated addresses on social media to bypass the join
              flow).
            </li>
            <li>
              Comply with our{' '}
              <Link href="/guidelines">Community Guidelines</Link>,{' '}
              <Link href="/privacy">Privacy Policy</Link>,{' '}
              <Link href="/refund-policy">Refund &amp; Cancellation Policy</Link>, and the obligations
              in this document — all incorporated by reference.
            </li>
          </ul>

          <h2>6. Fees</h2>
          <p>
            Alivestage charges <strong>flat platform fees</strong> — not a percentage commission on
            transactions between users:
          </p>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Fee</th>
                <th>Amount</th>
                <th>Paid by</th>
                <th>Purpose</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Host create fee</td>
                <td>₹{HOST_FEE}</td>
                <td>Host</td>
                <td>Publishes a jam listing on the platform</td>
              </tr>
              <tr>
                <td>Join fee</td>
                <td>₹{JOIN_FEE}</td>
                <td>Joiner</td>
                <td>Confirms your spot and unlocks the venue address</td>
              </tr>
            </tbody>
          </table>
          <p>
            These fees are collected by Alivestage via Razorpay. There is <strong>no split payment
            to hosts</strong> — hosts do not receive joiners&apos; fees. Alivestage is not a
            marketplace or escrow service. The full fee amount is a platform charge for using the
            service, similar to a listing or commitment fee.
          </p>
          <p>
            Payment processing costs are borne within our fee structure. Refund rules are set out in
            our <Link href="/refund-policy">Refund &amp; Cancellation Policy</Link>.
          </p>

          <h2>7. Limitation of liability</h2>
          <p>
            To the fullest extent permitted by applicable law:
          </p>
          <ul>
            <li>
              Alivestage is <strong>not liable</strong> for any injury, death, property damage,
              theft, loss, dispute, or other harm arising from a jam session — whether at a
              host&apos;s home, rehearsal space, studio, or any other venue.
            </li>
            <li>
              We are <strong>not liable</strong> for the conduct of any host, joiner, or third
              party — including harassment, assault, fraud, no-shows, or misrepresentation.
            </li>
            <li>
              We do <strong>not guarantee</strong> the quality, safety, legality, or suitability of
              any venue, participant, or session.
            </li>
            <li>
              We are <strong>not liable</strong> for service interruptions, data loss, payment
              processor delays, or errors in listings submitted by users.
            </li>
          </ul>
          <p>
            You are solely responsible for your own safety, your instruments and belongings, and
            your decisions about who to meet and where. We recommend meeting in spaces you trust,
            telling someone where you are going, and leaving any situation that feels unsafe.
          </p>
          <p>
            Alivestage is provided <strong>&ldquo;as is&rdquo;</strong> without warranties of any
            kind, express or implied, including fitness for a particular purpose or uninterrupted
            availability.
          </p>

          <h2>8. Account suspension and termination</h2>
          <p>
            We may suspend or terminate your access to Alivestage if we reasonably believe you have:
          </p>
          <ul>
            <li>Violated these Terms or our incorporated policies</li>
            <li>Provided false or misleading profile or jam information</li>
            <li>Engaged in harassment, unsafe behaviour, or repeated no-shows</li>
            <li>Attempted to abuse payments, refunds, or the address-gating system</li>
            <li>Used the platform for unlawful or fraudulent activity</li>
          </ul>
          <p>
            <strong>How suspension works:</strong> An admin may ban your account, which sets a
            suspension timestamp on your profile. While suspended, you cannot sign in or use
            authenticated features. Suspension does not refund active jam memberships
            or delete your payment history.
          </p>
          <p>
            <strong>Appeals:</strong> If you believe your account was suspended in error, email{' '}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with the subject line
            &ldquo;Account appeal&rdquo;, your account email, and a brief explanation. We aim to
            respond within 7 days. Reinstatement is at our discretion.
          </p>
          <p>
            You may stop using Alivestage at any time. There is currently no self-service account
            deletion; contact us if you want your data removed (see our{' '}
            <Link href="/privacy">Privacy Policy</Link>).
          </p>

          <h2>9. Intellectual property</h2>
          <p>
            The Alivestage name, logo, and platform design are owned by the operator. You retain
            ownership of content you submit (jam descriptions, photos, profile information). By
            posting content, you grant Alivestage a non-exclusive licence to display it on the
            platform for as long as the listing or profile is active.
          </p>

          <h2>10. Changes to these Terms</h2>
          <p>
            We may update these Terms when our features or legal obligations change. The effective
            date at the top will be revised. Continued use of Alivestage after an update constitutes
            acceptance of the revised Terms. Material changes may also be communicated by email or
            in-app notice where practicable.
          </p>

          <h2>11. Governing law and jurisdiction</h2>
          <p>
            These Terms are governed by the laws of <strong>India</strong>. Any dispute arising from
            or relating to these Terms or your use of Alivestage shall be subject to the exclusive
            jurisdiction of the courts at <strong>{JURISDICTION}</strong>.
          </p>

          <h2>12. Related policies</h2>
          <p>The following documents are incorporated into these Terms by reference:</p>
          <ul>
            <li>
              <Link href="/guidelines">Community Guidelines</Link> — expected behaviour at jams
            </li>
            <li>
              <Link href="/privacy">Privacy Policy</Link> — how we collect and use personal data
            </li>
            <li>
              <Link href="/refund-policy">Refund &amp; Cancellation Policy</Link> — fees, refunds,
              and membership cancellation
            </li>
          </ul>
          <p>
            If there is a conflict between these Terms and the Refund Policy on a payment or
            cancellation matter, the Refund Policy controls for that matter. For data handling, the
            Privacy Policy controls.
          </p>
        </article>
      </div>

      <div className={styles.footerWrap}>
        <Footer />
      </div>
    </>
  );
}
