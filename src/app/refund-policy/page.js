import Link from 'next/link';
import Footer from '@/components/landing/Footer';
import styles from '@/styles/legal.module.css';

export const metadata = {
  title: 'Refund & Cancellation Policy',
  description: 'How refunds and cancellations work for hosting and joining jams on Alivestage.',
};

const CONTACT_EMAIL = 'sandeep@alivestage.com';
const GRIEVANCE_OFFICER = 'Sandeep Kumawat';
const EFFECTIVE_DATE = '1 August 2026';

const HOST_FEE = 50;
const JOIN_FEE = 10;

export default function RefundPolicyPage() {
  return (
    <>
      <div className={`container ${styles.page}`}>
        <header className={styles.header}>
          <h1 className="pageTitle">Refund &amp; Cancellation Policy</h1>
          <p className="pageSubtitle">
            What happens to your ₹{HOST_FEE} host fee and ₹{JOIN_FEE} join fee when plans change.
          </p>
          <p className={styles.updated}>Effective {EFFECTIVE_DATE}</p>
        </header>

        <article className={styles.content}>
          <h2>Two fees, one rule</h2>
          <p>
            Alivestage charges two separate platform fees. <strong>Both are non-refundable</strong>{' '}
            once paid:
          </p>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Fee</th>
                <th>Amount</th>
                <th>When charged</th>
                <th>Refundable?</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Host create fee</strong></td>
                <td>₹{HOST_FEE}</td>
                <td>When you publish a jam</td>
                <td>No</td>
              </tr>
              <tr>
                <td><strong>Join fee</strong></td>
                <td>₹{JOIN_FEE}</td>
                <td>When you join a jam and unlock the venue address</td>
                <td>No</td>
              </tr>
            </tbody>
          </table>
          <p>
            These fees create commitment and reduce spam listings and no-shows. Alivestage does not
            handle cash refunds.
          </p>

          <h2>Host create fee (₹{HOST_FEE})</h2>
          <p>
            The ₹{HOST_FEE} host fee is charged when your jam is published.{' '}
            <strong>It is not refunded under any condition</strong>, including if:
          </p>
          <ul>
            <li>You cancel the jam yourself</li>
            <li>An admin cancels the jam</li>
            <li>No one joins your jam</li>
            <li>The jam is marked complete or ends without enough attendees</li>
          </ul>

          <h2>Join fee (₹{JOIN_FEE})</h2>
          <p>
            The ₹{JOIN_FEE} join fee is charged when you join a jam and unlock the venue address.{' '}
            <strong>It is not refunded under any condition</strong>, including if:
          </p>
          <ul>
            <li>The host cancels the jam</li>
            <li>An admin cancels the jam</li>
            <li>You leave voluntarily while the jam is still open</li>
            <li>You no-show or do not attend</li>
            <li>The jam goes ahead with fewer people than expected</li>
            <li>The host does not mark the jam complete</li>
            <li>You are removed for a reported violation</li>
          </ul>
          <p>
            When you leave or a jam is cancelled, your membership is cancelled and you lose access
            to the venue address. Your spot may reopen for someone else. The join fee is not returned.
          </p>

          <h2>One exception: payment without a spot</h2>
          <p>
            If you pay to join but the last spot was taken at the same moment by someone else, your
            payment is automatically refunded in full through Razorpay. You will not be added as a
            member. This is the only automatic refund on the platform.
          </p>

          <h2>Leaving a jam you joined</h2>
          <p>
            You can leave while the jam is still open — status <strong>Upcoming</strong> or{' '}
            <strong>Live</strong>. Once the host marks the jam as completed, or the jam is cancelled,
            you can no longer leave through the app.
          </p>
          <p>
            Leaving cancels your membership and opens your spot for someone else.{' '}
            <strong>No refund</strong> is issued for the join fee.
          </p>

          <h2>Host or admin cancels a jam</h2>
          <p>
            When a host or admin cancels a jam, all active joiners are notified by email. Joiner
            memberships are cancelled. <strong>Join fees are not refunded.</strong> The host&apos;s
            ₹{HOST_FEE} create fee is also not refunded.
          </p>

          <h2>Removed for a reported violation</h2>
          <p>
            If your behaviour at a jam is reported and reviewed, an Alivestage admin may remove you
            from that jam. <strong>Hosts cannot remove individual joiners</strong> — only admins can
            take this action after reviewing a report.
          </p>
          <ul>
            <li>
              <strong>Refund:</strong> None. Your ₹{JOIN_FEE} join fee is not refunded.
            </li>
            <li>
              <strong>Your membership:</strong> Cancelled with a timestamp (soft-deleted). You lose
              access to the venue address and your spot may reopen for others.
            </li>
            <li>
              <strong>Account suspension:</strong> In serious or repeated cases, we may ban your
              account from Alivestage entirely.
            </li>
          </ul>

          <h2>What happens to your record when you leave or a jam is cancelled</h2>
          <p>
            When you leave a jam or a host cancels, your membership is <strong>soft-deleted</strong>{' '}
            — not erased. In plain terms:
          </p>
          <ul>
            <li>
              Your membership row is marked with a cancellation timestamp. You no longer appear as an
              active joiner and lose access to the venue address.
            </li>
            <li>
              Your <strong>payment record stays on file</strong> — including the original amount and
              payment status. This trail exists for financial auditing and dispute resolution.
            </li>
            <li>
              Any ratings you already submitted for that jam remain unless the jam or account is
              deleted entirely.
            </li>
          </ul>

          <h2 id="disputes">Disputing a payment or cancellation</h2>
          <p>
            If you believe a payment was handled incorrectly — wrong amount charged, duplicate charge,
            or a spot-unavailable refund not received — contact us:
          </p>
          <ul>
            <li>
              <strong>{GRIEVANCE_OFFICER}</strong> —{' '}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </li>
          </ul>
          <p>
            Include your email address, the jam title, the date of payment, and a short description
            of the issue. Use the subject line &ldquo;Payment dispute&rdquo;. We aim to respond within
            7 days.
          </p>

          <h2>Related policies</h2>
          <p>
            See our <Link href="/terms">Terms &amp; Conditions</Link>,{' '}
            <Link href="/guidelines">Community Guidelines</Link>, and{' '}
            <Link href="/privacy">Privacy Policy</Link> for how payment and membership data is
            stored, and the <Link href="/">FAQ</Link> on the home page for a quick summary of fees
            and cancellations.
          </p>
        </article>
      </div>

      <div className={styles.footerWrap}>
        <Footer />
      </div>
    </>
  );
}
