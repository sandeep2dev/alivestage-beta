const nodemailer = require('nodemailer');

function getTransporter() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

async function sendMail({ to, subject, html }) {
  const transporter = getTransporter();
  if (!transporter) {
    const codeMatch = String(html || '').match(/>(\d{6})</);
    const hint = codeMatch ? ` | OTP: ${codeMatch[1]}` : '';
    console.log(`[email] (mock) To: ${to} | ${subject}${hint}`);
    return { mock: true };
  }
  return transporter.sendMail({
    from: process.env.EMAIL_FROM || 'sandeep@alivestage.com',
    to,
    subject,
    html,
  });
}

function bookingRequestHtml({ artistName, fanName, eventDate, eventDetails, venue }) {
  return `
    <h2>New booking request on Alivestage</h2>
    <p>Hi ${artistName},</p>
    <p><strong>${fanName}</strong> has requested a performance.</p>
    <ul>
      <li><strong>Date:</strong> ${eventDate}</li>
      <li><strong>Venue:</strong> ${venue}</li>
      <li><strong>Details:</strong> ${eventDetails}</li>
    </ul>
    <p>Log in to your dashboard to accept or reject this request.</p>
  `;
}

function bookingAcceptedHtml({ fanName, artistName, remainingAmount }) {
  return `
    <h2>Artist confirmed — pay Alivestage fee</h2>
    <p>Hi ${fanName},</p>
    <p><strong>${artistName}</strong> has confirmed your booking request.</p>
    <p>Pay the Alivestage fee of <strong>₹${remainingAmount}</strong> (10% of the booking value) to lock it in. Pay the artist their full performance fee directly, off-platform.</p>
  `;
}

function bookingRejectedHtml({ fanName, artistName }) {
  return `
    <h2>Booking request declined</h2>
    <p>Hi ${fanName},</p>
    <p><strong>${artistName}</strong> is unavailable for this request. You have not been charged.</p>
  `;
}

function bookingAutoRejectedHtml({ fanName }) {
  return `
    <h2>Booking request expired</h2>
    <p>Hi ${fanName},</p>
    <p>The artist did not respond within 48 hours. Your request has been closed. You were not charged.</p>
  `;
}

function bookingCancelledHtml({ fanName, reason }) {
  return `
    <h2>Booking cancelled</h2>
    <p>Hi ${fanName},</p>
    <p>Your booking was cancelled: ${reason}</p>
  `;
}

module.exports = {
  sendMail,
  bookingRequestHtml,
  bookingAcceptedHtml,
  bookingRejectedHtml,
  bookingAutoRejectedHtml,
  bookingCancelledHtml,
};
