const nodemailer = require('nodemailer');

function defaultFrom() {
  return process.env.EMAIL_FROM || 'sandeep@alivestage.com';
}

function formatFromAddress(from) {
  const value = String(from || defaultFrom()).trim();
  if (value.includes('<')) return value;
  return `Alivestage <${value}>`;
}

function getTransporter() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

async function sendViaResend({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: formatFromAddress(defaultFrom()),
      to: [to],
      subject,
      html,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || `Resend failed (${res.status})`);
  }

  return { provider: 'resend', id: data.id };
}

async function sendViaSmtp({ to, subject, html }) {
  const transporter = getTransporter();
  if (!transporter) return null;

  const result = await transporter.sendMail({
    from: formatFromAddress(defaultFrom()),
    to,
    subject,
    html,
  });

  return { provider: 'smtp', messageId: result.messageId };
}

async function sendMail({ to, subject, html }) {
  if (process.env.RESEND_API_KEY) {
    return sendViaResend({ to, subject, html });
  }

  const transporter = getTransporter();
  if (transporter) {
    return sendViaSmtp({ to, subject, html });
  }

  const codeMatch = String(html || '').match(/(?:^|>|\s)(\d{6})(?:<|\s|$)/);
  const hint = codeMatch ? ` | OTP: ${codeMatch[1]}` : '';
  console.log(`[email] (mock) To: ${to} | ${subject}${hint}`);
  return { mock: true };
}

module.exports = {
  sendMail,
};
