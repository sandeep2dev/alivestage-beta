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
    const codeMatch = String(html || '').match(/(?:^|>|\s)(\d{6})(?:<|\s|$)/);
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

module.exports = {
  sendMail,
};
