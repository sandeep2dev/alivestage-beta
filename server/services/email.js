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
    console.log(`[email] (mock) To: ${to} | ${subject}`);
    return { mock: true };
  }
  return transporter.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@alivestage.com',
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
    <h2>Booking confirmed — pay remaining balance</h2>
    <p>Hi ${fanName},</p>
    <p><strong>${artistName}</strong> has accepted your booking request.</p>
    <p>Please pay the remaining balance of <strong>₹${remainingAmount}</strong> to secure your event.</p>
  `;
}

function bookingRejectedHtml({ fanName, artistName }) {
  return `
    <h2>Booking request declined</h2>
    <p>Hi ${fanName},</p>
    <p><strong>${artistName}</strong> has declined your booking request. Your token payment will be refunded.</p>
  `;
}

function bookingAutoRejectedHtml({ fanName }) {
  return `
    <h2>Booking request expired</h2>
    <p>Hi ${fanName},</p>
    <p>The artist did not respond within 48 hours. Your booking has been cancelled and your token refunded.</p>
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
