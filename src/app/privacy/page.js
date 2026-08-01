import Link from 'next/link';
import Footer from '@/components/landing/Footer';
import styles from '@/styles/legal.module.css';

export const metadata = {
  title: 'Privacy Policy',
  description: 'How Alivestage collects, uses, and protects your personal data.',
};

const PRIVACY_EMAIL = 'sandeep@alivestage.com';
const GRIEVANCE_OFFICER = 'Sandeep Kumawat';
const EFFECTIVE_DATE = '1 August 2026';

export default function PrivacyPage() {
  return (
    <>
      <div className={`container ${styles.page}`}>
        <header className={styles.header}>
          <h1 className="pageTitle">Privacy Policy</h1>
          <p className="pageSubtitle">
            How we handle your data when you use Alivestage to host and join local jams.
          </p>
          <p className={styles.updated}>Effective {EFFECTIVE_DATE}</p>
        </header>

        <article className={styles.content}>
          <h2>Who we are</h2>
          <p>
            Alivestage is a community jamming platform for musicians in India. It is operated by
            an individual (not a registered company). For any privacy-related question, email{' '}
            <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>.
          </p>

          <h2>What we collect and why</h2>
          <p>
            We collect only what each feature needs. Each category below has one purpose — we do
            not repurpose data for unrelated uses.
          </p>

          <table className={styles.table}>
            <thead>
              <tr>
                <th>Data</th>
                <th>When collected</th>
                <th>Purpose</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Email address</strong></td>
                <td>Sign-in</td>
                <td>To send a one-time passcode and verify your account, and to send service emails (join confirmations, refunds, rating prompts).</td>
              </tr>
              <tr>
                <td><strong>Display name</strong></td>
                <td>Onboarding</td>
                <td>To show who you are when you host a jam, join a jam, appear on a public profile, or submit a help request.</td>
              </tr>
              <tr>
                <td><strong>City</strong></td>
                <td>Onboarding; hosting a jam</td>
                <td>To show your general location on your profile and to list jams by city in the feed.</td>
              </tr>
              <tr>
                <td><strong>Pincode</strong></td>
                <td>Onboarding</td>
                <td>To validate your location during setup. Pincode is stored on your account but is <strong>not shown</strong> on your public profile or to other users.</td>
              </tr>
              <tr>
                <td><strong>Profile photo</strong></td>
                <td>Profile settings (optional)</td>
                <td>To display an avatar on your public profile and in jam listings.</td>
              </tr>
              <tr>
                <td><strong>One-time passcode</strong></td>
                <td>Sign-in</td>
                <td>To confirm you own the email address. Stored as a hash for up to 10 minutes, then deleted when you sign in successfully or after too many failed attempts.</td>
              </tr>
              <tr>
                <td><strong>Jam title, summary, and description</strong></td>
                <td>Hosting a jam</td>
                <td>To describe the jam to people browsing and considering whether to join.</td>
              </tr>
              <tr>
                <td><strong>Jam city</strong></td>
                <td>Hosting a jam</td>
                <td>To show the general area of a jam to everyone before they pay — so you can decide whether it suits you without revealing the exact venue.</td>
              </tr>
              <tr>
                <td><strong>Precise venue address and map coordinates</strong></td>
                <td>Hosting a jam</td>
                <td>To give paid joiners and the host directions to the venue. See the address protection section below.</td>
              </tr>
              <tr>
                <td><strong>Images in jam descriptions</strong></td>
                <td>Hosting or editing a jam (optional)</td>
                <td>To illustrate the jam in its public listing.</td>
              </tr>
              <tr>
                <td><strong>Payment records</strong> (amount, fee type, Razorpay order and payment IDs, refund status)</td>
                <td>Paying ₹200 to host or ₹50 to join</td>
                <td>To process platform fees, issue refunds when a jam is cancelled or you leave, and maintain a financial audit trail.</td>
              </tr>
              <tr>
                <td><strong>Jam membership</strong> (which jams you joined or hosted)</td>
                <td>Joining or hosting</td>
                <td>To manage your spot, unlock venue details after payment, and run attendance and ratings after a jam ends.</td>
              </tr>
              <tr>
                <td><strong>Attendance marks</strong> (host-marked attendance; optional self-marked presence)</td>
                <td>After a jam ends</td>
                <td>To determine who attended and who is eligible to rate others. Host-marked attendance is the one used for ratings.</td>
              </tr>
              <tr>
                <td><strong>Ratings</strong> (score 1–5, who rated whom, for which jam)</td>
                <td>Within 5 days after a completed jam</td>
                <td>To calculate community reputation. Individual ratings are not shown on public profiles — only an aggregate score once you have received 10 or more ratings.</td>
              </tr>
              <tr>
                <td><strong>Help message</strong></td>
                <td>When you use the Help dialog</td>
                <td>To respond to your support request. Your name, email, and message are included.</td>
              </tr>
              <tr>
                <td><strong>Session token</strong></td>
                <td>After sign-in</td>
                <td>To keep you signed in on your device. Stored in your browser&apos;s local storage.</td>
              </tr>
            </tbody>
          </table>

          <h3>What we do not collect</h3>
          <ul>
            <li>Phone numbers — sign-in is email-only.</li>
            <li>Payment card, UPI, or bank details — Razorpay collects these inside their checkout; we never see or store them.</li>
            <li>Discord or other social-login accounts — there is no third-party sign-in on Alivestage.</li>
          </ul>

          <h2>How we protect venue addresses</h2>
          <div className={styles.highlight}>
            <p>
              <strong>Your home or rehearsal space should not be visible to strangers who have not committed to attend.</strong>
            </p>
            <p>
              When you browse jams, you see the <strong>city</strong>, title, summary, schedule, and host name — but not the exact address. The precise venue address and map coordinates are unlocked only after you pay the ₹50 join fee (or if you are the host). This is enforced on our servers, not just hidden in the app interface — so the address cannot be retrieved through the API without an active, paid membership.
            </p>
            <p>
              Hosts enter the precise address before paying the ₹200 hosting fee. While the jam is being set up, that address is held temporarily until payment succeeds; it is never shown publicly until the jam is live and you are a paid joiner or the host.
            </p>
          </div>

          <h2>Payments and Razorpay</h2>
          <p>
            Alivestage uses <strong>Razorpay</strong> to collect the ₹200 host fee and ₹50 join fee. When you pay:
          </p>
          <ul>
            <li>Razorpay receives the order amount, a receipt reference, and internal notes (fee type, your user ID, and for joins, the jam ID).</li>
            <li>Razorpay&apos;s checkout collects your payment method inside their secure iframe. We do not pre-fill your name or email into Razorpay checkout.</li>
            <li>We store only the Razorpay order ID, payment ID, amount, status, and any refund details — not card numbers, UPI VPAs, or bank account information.</li>
          </ul>

          <h2>Third parties we share data with</h2>
          <ul>
            <li>
              <strong>Razorpay</strong> — payment processing and refunds.
            </li>
            <li>
              <strong>Supabase</strong> — database hosting and file storage (profile photos, jam images).
            </li>
            <li>
              <strong>Our email provider (SMTP)</strong> — delivering sign-in codes and service notifications to your email address. We do not use an SMS or phone OTP service.
            </li>
            <li>
              <strong>OpenStreetMap Nominatim and CARTO map tiles</strong> — used only in the venue picker when a host creates or edits a jam. Search queries and coordinates are sent from your browser to these services; Alivestage does not send your profile data to them.
            </li>
            <li>
              <strong>Discord</strong> (optional, if configured) — internal activity notifications (sign-ups, jams created or joined, refunds) and help messages may be posted to private Discord channels. Discord is not used for sign-in or identity verification.
            </li>
          </ul>
          <p>
            We do not sell your personal data. We share it only as needed to run the service, as described above.
          </p>

          <h2>How long we keep data</h2>
          <ul>
            <li>
              <strong>Sign-in codes:</strong> deleted within about 10 minutes, or immediately after a successful sign-in.
            </li>
            <li>
              <strong>Jam drafts before payment:</strong> held for up to 30 minutes in a pending order, then discarded if payment is not completed.
            </li>
            <li>
              <strong>Account and jam data:</strong> kept for as long as your account is active and the jams you participated in remain on the platform.
            </li>
            <li>
              <strong>Payment records:</strong> retained after a jam ends, after you leave a jam, or after a refund. We keep these for financial and dispute records. There is no automatic deletion schedule in our systems today.
            </li>
            <li>
              <strong>Cancelled memberships:</strong> when you leave a jam or a host cancels, your membership row is marked with a cancellation timestamp but kept for audit purposes. Your payment record and any ratings already submitted remain.
            </li>
            <li>
              <strong>Ratings:</strong> kept as long as the associated jam and user accounts exist, to maintain reputation history.
            </li>
          </ul>
          <p>
            There is currently no self-service account deletion in the app. If you want your data removed, contact us (see Your rights below).
          </p>

          <h2>Your rights</h2>
          <p>You can:</p>
          <ul>
            <li>
              <strong>Access</strong> most of your data through your profile page, transaction history, and jam listings while signed in.
            </li>
            <li>
              <strong>Correct</strong> your display name, city, pincode, and profile photo from your profile settings.
            </li>
            <li>
              <strong>Request deletion</strong> of your account and associated personal data by emailing{' '}
              <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>. We will respond within a reasonable time. Note that payment records may be retained where required for legal or financial obligations, and some data may remain in backups for a limited period.
            </li>
            <li>
              <strong>Withdraw from a jam</strong> you joined (subject to our{' '}
              <Link href="/refund-policy">Refund &amp; Cancellation Policy</Link>) — this cancels your membership but does not delete your account.
            </li>
          </ul>
          <p>
            To exercise any of these rights, or if you have a question about how your data is handled, email{' '}
            <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a> with the subject line &ldquo;Privacy request&rdquo; and describe what you need.
          </p>

          <h2>Grievance officer</h2>
          <p>
            If you have a complaint about how your personal data is handled, contact our grievance officer:
          </p>
          <ul>
            <li>
              <strong>Name:</strong> {GRIEVANCE_OFFICER}
            </li>
            <li>
              <strong>Email:</strong>{' '}
              <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>
            </li>
          </ul>
          <p>
            We aim to acknowledge grievances within 7 days and resolve them within 30 days where possible.
          </p>

          <h2>Legal framework</h2>
          <p>
            This policy is intended to comply with India&apos;s <strong>Information Technology Act, 2000</strong> and the{' '}
            <strong>Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011</strong>{' '}
            (SPDI Rules) for as long as they apply to our operations.
          </p>
          <p>
            India&apos;s <strong>Digital Personal Data Protection Act, 2023</strong> (DPDP Act) is expected to be fully enforced from <strong>May 2027</strong>. We will update this policy ahead of that date to reflect any additional requirements under the DPDP Act.
          </p>

          <h2>Changes to this policy</h2>
          <p>
            We may update this policy when our features or legal obligations change. The effective date at the top will be revised when we do. Continued use of Alivestage after an update means you accept the revised policy.
          </p>
          <p>
            See also our <Link href="/terms">Terms &amp; Conditions</Link>,{' '}
            <Link href="/guidelines">Community Guidelines</Link>,{' '}
            <Link href="/refund-policy">Refund &amp; Cancellation Policy</Link>, and the{' '}
            <Link href="/">FAQ</Link> for how fees, refunds, and address unlocking work in practice.
          </p>
        </article>
      </div>

      <div className={styles.footerWrap}>
        <Footer />
      </div>
    </>
  );
}
