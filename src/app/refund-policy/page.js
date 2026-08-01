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

const HOST_FEE = 200;
const JOIN_FEE = 50;
const JOIN_LEAVE_REFUND = 25;

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
          <h2>Two fees, two rules</h2>
          <p>
            Alivestage charges two separate fees. Refunds are handled differently for each:
          </p>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Fee</th>
                <th>Amount</th>
                <th>When charged</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Host create fee</strong></td>
                <td>₹{HOST_FEE}</td>
                <td>When you publish a jam</td>
              </tr>
              <tr>
                <td><strong>Join fee</strong></td>
                <td>₹{JOIN_FEE}</td>
                <td>When you join a jam and unlock the venue address</td>
              </tr>
            </tbody>
          </table>
          <p>
            All refunds are processed through <strong>Razorpay</strong> back to the same payment
            method you used. Alivestage does not handle cash refunds.
          </p>

          <h2>When joiners get a full refund (₹{JOIN_FEE})</h2>
          <p>You receive a <strong>100% refund</strong> of your join fee if:</p>
          <ul>
            <li>
              <strong>The host cancels the jam</strong> — before or after it was scheduled to start.
              All active joiners are refunded in full and notified by email.
            </li>
            <li>
              <strong>An admin cancels the jam</strong> — same as a host cancellation; all active
              joiners receive a full refund.
            </li>
            <li>
              <strong>The jam was full when you paid</strong> — if you paid but the last spot was
              taken by someone else at the same time, your payment is automatically refunded in full.
              You will not be added as a member.
            </li>
          </ul>

          <h2>When joiners get a partial refund (₹{JOIN_LEAVE_REFUND})</h2>
          <p>
            If <strong>you choose to leave</strong> a jam you already joined, you receive a{' '}
            <strong>50% refund (₹{JOIN_LEAVE_REFUND})</strong>. The remaining ₹{JOIN_LEAVE_REFUND}{' '}
            is not refunded.
          </p>
          <p>You can leave only while the jam is still open — status <strong>Upcoming</strong> or{' '}
            <strong>Live</strong>. Once the host marks the jam as completed, or the jam is cancelled,
            you can no longer leave through the app.
          </p>
          <div className={styles.highlight}>
            <p>
              <strong>There is no separate &ldquo;late cancellation&rdquo; window in our systems.</strong>{' '}
              As long as the jam is still open, leaving always triggers the same 50% refund. The cutoff
              is when the jam ends or is marked complete — not a number of hours before start time.
            </p>
          </div>
          <p>
            When you leave, your membership is cancelled and your spot opens for someone else. You
            lose access to the venue address.
          </p>

          <h2>When joiners do not get a refund</h2>
          <p>You receive <strong>no refund</strong> of your join fee if:</p>
          <ul>
            <li>
              <strong>You no-show</strong> — you joined and paid but did not attend. The join fee
              stays with the platform. Hosts mark who actually attended after the jam; this affects
              ratings eligibility, not refunds.
            </li>
            <li>
              <strong>You attended</strong> — the jam took place and you were present. No refund
              applies after a completed jam.
            </li>
            <li>
              <strong>You left voluntarily</strong> — you already received your 50% refund (₹{JOIN_LEAVE_REFUND}).
              The remaining ₹{JOIN_LEAVE_REFUND} is not returned.
            </li>
            <li>
              <strong>The jam goes ahead with fewer people than expected</strong> — there is no minimum
              joiner count required for a jam to proceed. If the host does not cancel, your fee is
              not refunded simply because turnout was low.
            </li>
            <li>
              <strong>The host does not mark the jam complete</strong> — if a host abandons a jam
              without cancelling it through the app, joiner fees are not automatically refunded. Contact
              us (see below) if you believe a jam did not happen as described.
            </li>
            <li>
              <strong>You are removed for a reported violation</strong> — see the section below.
            </li>
          </ul>

          <h2>Removed for a reported violation</h2>
          <p>
            If your behaviour at a jam is reported and reviewed, an Alivestage admin may remove you
            from that jam. <strong>Hosts cannot remove individual joiners</strong> — only admins can
            take this action after reviewing a report (for example, via our Help form or email).
          </p>
          <ul>
            <li>
              <strong>Refund:</strong> None. If you are removed for a violation — such as harassment,
              misrepresentation, unsafe behaviour, or repeated no-shows after warnings — your ₹{JOIN_FEE}{' '}
              join fee is not refunded.
            </li>
            <li>
              <strong>Your membership:</strong> Cancelled with a timestamp (soft-deleted), same as
              when you leave voluntarily — but without any refund. You lose access to the venue
              address and your spot may reopen for others.
            </li>
            <li>
              <strong>Payment record:</strong> Kept on file with no refund issued, for audit and
              dispute purposes.
            </li>
            <li>
              <strong>Account suspension:</strong> In serious or repeated cases, we may also ban your
              account from Alivestage entirely. A ban blocks sign-in; it does not automatically
              refund fees for jams you still hold spots on.
            </li>
          </ul>
          <p>
            If you believe you were removed in error, contact us under{' '}
            <a href="#disputes">Disputing a refund decision</a> below with the jam details and what
            happened.
          </p>
          <p>
            <strong>Admin cancels the entire jam</strong> (for example, because of a host violation)
            is different: all active joiners receive a full ₹{JOIN_FEE} refund, while the host&apos;s
            ₹{HOST_FEE} fee is still not returned.
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
          <p>
            When you cancel, joiners receive their full ₹{JOIN_FEE} back — but your ₹{HOST_FEE} host
            fee is not returned. This is by design: the host fee reflects your commitment to listing
            the jam.
          </p>

          <h2>How refunds are processed</h2>
          <ol>
            <li>
              When a refund is triggered (host cancel, you leave, or event-full auto-refund), we call
              the Razorpay refund API immediately with your original payment ID.
            </li>
            <li>
              Refunds are sent to the same UPI, card, or wallet you paid with. Alivestage cannot
              redirect refunds to a different account.
            </li>
            <li>
              We use Razorpay&apos;s standard processing speed. The refund is initiated right away on
              our side; your bank or UPI provider typically credits the amount within{' '}
              <strong>5–7 business days</strong>. In rare cases it may take longer depending on your
              payment provider.
            </li>
            <li>
              You receive an email when a host cancels a jam you joined. For voluntary leaves and
              event-full refunds, the app confirms the refund when you leave or when payment fails
              to complete.
            </li>
          </ol>
          <p>
            Refund status is recorded in your transaction history. Statuses you may see:{' '}
            <strong>paid</strong>, <strong>refunded_full</strong>, or <strong>refunded_partial</strong>.
          </p>

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
              Your <strong>payment record stays on file</strong> — including the original amount, any
              refund issued, and the reason (host cancelled, you left, or event was full). This trail
              exists for financial auditing and dispute resolution.
            </li>
            <li>
              Any ratings you already submitted for that jam remain unless the jam or account is
              deleted entirely.
            </li>
          </ul>
          <p>
            Soft-deletion protects the audit trail. It does not mean your payment was forgotten — it
            means your active participation ended while the transaction history is preserved.
          </p>

          <h2 id="disputes">Disputing a refund decision</h2>
          <p>
            If you believe a refund was handled incorrectly — wrong amount, not received after 7
            business days, or a jam that did not happen — contact us:
          </p>
          <ul>
            <li>
              <strong>{GRIEVANCE_OFFICER}</strong> —{' '}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </li>
          </ul>
          <p>
            Include your email address, the jam title, the date of payment, and a short description
            of the issue. Use the subject line &ldquo;Refund dispute&rdquo;. We aim to respond within
            7 days.
          </p>
          <p>
            For payment-method issues (refund initiated but not showing in your account), we can
            confirm the Razorpay refund ID on our side. Your bank or UPI app may need additional
            time to process the credit.
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
