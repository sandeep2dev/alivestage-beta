/**
 * Branded HTML email templates for Alivestage transactional mail.
 * Table-based layout with inline styles for broad client support.
 */

const { appUrl } = require('./cancelEvent');

const BRAND = {
  page: '#0d0e12',
  surface: '#16171C',
  border: '#2A2B31',
  text: '#F2F0EC',
  textBody: '#A9A6A0',
  textBodySoft: '#8E8F98',
  textEmphasis: '#D4D4DA',
  textMuted: '#9A9BA3',
  textFaint: '#6E6F78',
  primary: '#FF6B35',
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatEventWhen(iso) {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  } catch {
    return String(iso || '');
  }
}

function formatJoinEmailSchedule(event) {
  try {
    const start = new Date(event.start_at);
    const datePart = start.toLocaleString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const timePart = start.toLocaleString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const duration = Number(event.duration_minutes) || 0;
    const durationPart = duration ? ` &middot; ${duration} minutes` : '';
    return `${datePart} &middot; ${timePart}${durationPart}`;
  } catch {
    return escapeHtml(formatEventWhen(event.start_at));
  }
}

/** Navbar Logo (variant="full", size="md") for email headers — PNG img for client support. */
function emailLogoHtml({ iconHeight = 30, wordmarkSize = 20, title = 'Alivestage' } = {}) {
  const safeTitle = escapeHtml(title);
  const logoUrl = escapeHtml(`${appUrl()}/brand/logo-mark.png`);
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding-right:4px;vertical-align:middle;">
          <img src="${logoUrl}" width="${iconHeight}" height="${iconHeight}" alt=""
            style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;" />
        </td>
        <td style="vertical-align:middle;">
          <span style="font-family:'Space Grotesk',Arial,sans-serif;font-size:${wordmarkSize}px;font-weight:600;color:${BRAND.primary};letter-spacing:-0.02em;white-space:nowrap;">
            ${safeTitle}
          </span>
        </td>
      </tr>
    </table>
  `;
}

const OTP_EXPIRY_MINUTES = 10;

function darkEmailFooter({ width = 480 } = {}) {
  return `
        <table role="presentation" width="${width}" cellpadding="0" cellspacing="0" style="padding-top:20px;max-width:${width}px;width:100%;">
          <tr>
            <td align="center">
              <span style="font-size:12px;color:#4A4B52;">Alivestage &middot; Live music, made together</span>
            </td>
          </tr>
        </table>
  `;
}

function otpEmailHtml(code, { expiryMinutes = OTP_EXPIRY_MINUTES } = {}) {
  const safeCode = escapeHtml(code);
  const minutes = Number(expiryMinutes) || OTP_EXPIRY_MINUTES;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Alivestage - Your Verification Code</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.page};font-family:Inter,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">
    Your Alivestage verification code is ${safeCode}. It expires in ${minutes} minutes.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.page};padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:${BRAND.surface};border-radius:12px;overflow:hidden;border:1px solid ${BRAND.border};max-width:480px;width:100%;">

          <tr>
            <td style="padding:28px 32px 0 32px;">
              ${emailLogoHtml()}
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px 4px 32px;">
              <span style="font-family:'Space Grotesk',Arial,sans-serif;font-size:22px;font-weight:600;color:${BRAND.text};">
                Your verification code
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:6px 32px 24px 32px;">
              <span style="font-size:14px;font-weight:400;color:${BRAND.textBody};line-height:1.6;">
                Use this code to sign in to Alivestage. It expires in ${minutes} minutes.
              </span>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 24px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(255,107,53,0.08);border:1px solid rgba(255,107,53,0.25);border-radius:10px;">
                <tr>
                  <td align="center" style="padding:24px 16px;">
                    <span style="font-family:'Space Grotesk',Arial,sans-serif;font-size:36px;font-weight:700;color:${BRAND.primary};letter-spacing:10px;">${safeCode}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr><td style="padding:0 32px;"><div style="border-top:1px solid ${BRAND.border};"></div></td></tr>

          <tr>
            <td style="padding:20px 32px 28px 32px;">
              <span style="font-size:12px;font-weight:400;color:${BRAND.textBodySoft};line-height:1.65;">
                Didn&rsquo;t request this code? You can safely ignore this email &mdash; no one can access your account without it. Never share this code with anyone, including someone claiming to be from Alivestage.
              </span>
            </td>
          </tr>

        </table>

        ${darkEmailFooter({ width: 480 })}

      </td>
    </tr>
  </table>
</body>
</html>`;
}

function joinConfirmedEmailHtml({
  event,
  hostName,
  eventUrl,
  amountPaid,
  paymentId,
}) {
  const title = escapeHtml(event.title);
  const host = escapeHtml(hostName || 'your host');
  const schedule = formatJoinEmailSchedule(event);
  const city = escapeHtml(event.city);
  const address = escapeHtml(event.precise_address || 'Address shared on event page');
  const safeEventUrl = escapeHtml(eventUrl);
  const amount = Number(amountPaid) || 50;
  const paymentLine = paymentId
    ? `&#8377;${amount} &middot; <span style="color:${BRAND.textBodySoft};">Payment ID: ${escapeHtml(paymentId)}</span>`
    : `&#8377;${amount}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Alivestage - Reservation Confirmed</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.page};font-family:Inter,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">
    You're confirmed for ${title}. See you there.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.page};padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:${BRAND.surface};border-radius:12px;overflow:hidden;border:1px solid ${BRAND.border};max-width:560px;width:100%;">

          <tr>
            <td style="padding:28px 32px 0 32px;">
              ${emailLogoHtml()}
            </td>
          </tr>

          <tr>
            <td style="padding:20px 32px 0 32px;">
              <span style="display:inline-block;background-color:rgba(255,107,53,0.12);color:${BRAND.primary};font-size:12px;font-weight:600;padding:6px 12px;border-radius:20px;letter-spacing:0.3px;">
                RESERVATION CONFIRMED
              </span>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 32px 4px 32px;">
              <span style="font-family:'Space Grotesk',Arial,sans-serif;font-size:26px;font-weight:600;color:${BRAND.text};line-height:1.3;">
                You&rsquo;re in &mdash; ${title}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:6px 32px 24px 32px;">
              <span style="font-size:14px;font-weight:400;color:${BRAND.textBody};line-height:1.6;">
                Hosted by <span style="color:${BRAND.primary};font-weight:500;">${host}</span> &middot; See you there.
              </span>
            </td>
          </tr>

          <tr><td style="padding:0 32px;"><div style="border-top:1px solid ${BRAND.border};"></div></td></tr>

          <tr>
            <td style="padding:24px 32px 0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:14px;font-size:13px;font-weight:400;color:${BRAND.textBodySoft};width:110px;vertical-align:top;">Date &amp; Time</td>
                  <td style="padding-bottom:14px;font-size:14px;font-weight:400;color:${BRAND.textEmphasis};">${schedule}</td>
                </tr>
                <tr>
                  <td style="padding-bottom:14px;font-size:13px;font-weight:400;color:${BRAND.textBodySoft};vertical-align:top;">Venue</td>
                  <td style="padding-bottom:14px;font-size:14px;font-weight:400;color:${BRAND.textEmphasis};">${address}<br><span style="color:${BRAND.textBody};font-size:13px;">${city}</span></td>
                </tr>
                <tr>
                  <td style="padding-bottom:14px;font-size:13px;font-weight:400;color:${BRAND.textBodySoft};vertical-align:top;">Amount Paid</td>
                  <td style="padding-bottom:14px;font-size:14px;font-weight:400;color:${BRAND.textEmphasis};">${paymentLine}</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:12px 32px 28px 32px;">
              <a href="${safeEventUrl}" style="display:inline-block;background-color:${BRAND.primary};color:${BRAND.surface};font-weight:700;font-size:14px;text-decoration:none;padding:12px 24px;border-radius:8px;">
                View Event Details
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 28px 32px;">
              <div style="border-top:1px solid ${BRAND.border};padding-top:16px;">
                <span style="font-size:12px;font-weight:400;color:${BRAND.textBodySoft};line-height:1.65;">
                  Need a refund or have a question about this event? Reply to this email or reach out from the event page. This confirms your spot at ${title} &mdash; please don&rsquo;t share the venue address publicly.
                </span>
              </div>
            </td>
          </tr>

        </table>

        ${darkEmailFooter({ width: 560 })}

      </td>
    </tr>
  </table>
</body>
</html>`;
}

module.exports = {
  escapeHtml,
  formatEventWhen,
  emailLogoHtml,
  otpEmailHtml,
  joinConfirmedEmailHtml,
};
