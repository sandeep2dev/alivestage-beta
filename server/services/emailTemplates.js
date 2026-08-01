/**
 * Branded HTML email templates for Alivestage transactional mail.
 * Table-based layout with inline styles for broad client support.
 * Visual identity aligned with landing page and policy pages.
 */

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}

const BRAND = {
  page: '#16171C',
  elevated: '#292B33',
  border: '#33353D',
  text: '#F2F0EC',
  textBody: '#A9A6A0',
  textBodySoft: '#6E6B66',
  textEmphasis: '#F2F0EC',
  primary: '#FF6B35',
  secondary: '#8B7FE8',
  success: '#4CAF7D',
};

const TAGLINE_LINE1 = 'Community jamming for musicians in India.';
const TAGLINE_LINE2 = 'Find your people. Play together.';

const OTP_EXPIRY_MINUTES = 10;

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

function emailEyebrow(text) {
  return `
    <span style="display:inline-block;font-family:Inter,Arial,sans-serif;font-size:11px;font-weight:600;color:${BRAND.primary};letter-spacing:0.12em;text-transform:uppercase;">
      ${escapeHtml(text)}
    </span>
  `;
}

function emailBadge(text) {
  return `
    <span style="display:inline-block;background-color:rgba(255,107,53,0.12);color:${BRAND.primary};font-size:12px;font-weight:600;padding:6px 12px;border-radius:20px;letter-spacing:0.3px;">
      ${escapeHtml(text)}
    </span>
  `;
}

function emailPrimaryButton(href, label) {
  return `
    <a href="${escapeHtml(href)}" style="display:inline-block;background-color:${BRAND.primary};color:${BRAND.page};font-family:Inter,Arial,sans-serif;font-weight:700;font-size:14px;text-decoration:none;padding:12px 24px;border-radius:8px;">
      ${escapeHtml(label)}
    </a>
  `;
}

function emailDivider() {
  return `<tr><td style="padding:0 24px;"><div style="border-top:1px solid ${BRAND.border};"></div></td></tr>`;
}

function darkEmailFooter() {
  const base = appUrl();
  const guidelines = escapeHtml(`${base}/guidelines`);
  const terms = escapeHtml(`${base}/terms`);
  const privacy = escapeHtml(`${base}/privacy`);
  const refund = escapeHtml(`${base}/refund-policy`);

  return `
          <tr>
            <td style="padding:24px 24px 0 24px;">
              <div style="border-top:1px solid ${BRAND.border};padding-top:24px;"></div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 24px 12px 24px;">
              <span style="font-family:Inter,Arial,sans-serif;font-size:12px;color:${BRAND.textBodySoft};line-height:1.6;">
                ${TAGLINE_LINE1}<br />${TAGLINE_LINE2}
              </span>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 24px 40px 24px;">
              <span style="font-family:Inter,Arial,sans-serif;font-size:11px;color:${BRAND.textBodySoft};">
                <a href="${guidelines}" style="color:${BRAND.textBody};text-decoration:none;">Guidelines</a>
                &nbsp;&middot;&nbsp;
                <a href="${terms}" style="color:${BRAND.textBody};text-decoration:none;">Terms</a>
                &nbsp;&middot;&nbsp;
                <a href="${privacy}" style="color:${BRAND.textBody};text-decoration:none;">Privacy</a>
                &nbsp;&middot;&nbsp;
                <a href="${refund}" style="color:${BRAND.textBody};text-decoration:none;">Refunds</a>
              </span>
            </td>
          </tr>
  `;
}

function emailShell({ title, preheader, width = 480, bodyHtml }) {
  const safeTitle = escapeHtml(title);
  const safePreheader = escapeHtml(preheader);
  const bg = BRAND.page;

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>${safeTitle}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    :root { color-scheme: dark; supported-color-schemes: dark; }
    body, table, td { background-color: ${bg} !important; }
  </style>
</head>
<body bgcolor="${bg}" style="margin:0;padding:0;width:100% !important;min-width:100%;background-color:${bg};font-family:Inter,Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">
    ${safePreheader}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${bg}" style="width:100%;background-color:${bg};margin:0;padding:0;">
    <tr>
      <td align="center" bgcolor="${bg}" style="background-color:${bg};padding:40px 16px;">
        <table role="presentation" width="${width}" cellpadding="0" cellspacing="0" border="0" bgcolor="${bg}" style="background-color:${bg};max-width:${width}px;width:100%;">
          ${bodyHtml}
          ${darkEmailFooter()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function otpEmailHtml(code, { expiryMinutes = OTP_EXPIRY_MINUTES } = {}) {
  const safeCode = escapeHtml(code);
  const minutes = Number(expiryMinutes) || OTP_EXPIRY_MINUTES;

  const bodyHtml = `
          <tr>
            <td style="padding:0 24px;">
              ${emailLogoHtml()}
            </td>
          </tr>

          <tr>
            <td style="padding:20px 24px 0 24px;">
              ${emailEyebrow('Community jamming platform')}
            </td>
          </tr>

          <tr>
            <td style="padding:12px 24px 4px 24px;">
              <span style="font-family:'Space Grotesk',Arial,sans-serif;font-size:22px;font-weight:600;color:${BRAND.text};">
                Your verification code
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:6px 24px 24px 24px;">
              <span style="font-size:14px;font-weight:400;color:${BRAND.textBody};line-height:1.6;">
                Use this code to sign in to Alivestage. It expires in ${minutes} minutes.
              </span>
            </td>
          </tr>

          <tr>
            <td style="padding:0 24px 24px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.elevated};border-radius:10px;">
                <tr>
                  <td align="center" style="padding:24px 16px;">
                    <span style="font-family:'Space Grotesk',Arial,sans-serif;font-size:36px;font-weight:700;color:${BRAND.primary};letter-spacing:10px;">${safeCode}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${emailDivider()}

          <tr>
            <td style="padding:20px 24px 0 24px;">
              <span style="font-size:12px;font-weight:400;color:${BRAND.textBodySoft};line-height:1.65;">
                Didn&rsquo;t request this code? You can safely ignore this email. Never share this code with anyone, including someone claiming to be from Alivestage.
              </span>
            </td>
          </tr>
  `;

  return emailShell({
    title: 'Alivestage — Your verification code',
    preheader: `Your Alivestage verification code is ${safeCode}. It expires in ${minutes} minutes.`,
    width: 480,
    bodyHtml,
  });
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
  const address = escapeHtml(event.precise_address || 'Address shared on jam page');
  const safeEventUrl = escapeHtml(eventUrl);
  const amount = Number(amountPaid) || 50;
  const paymentLine = paymentId
    ? `&#8377;${amount} &middot; <span style="color:${BRAND.textBodySoft};">Payment ID: ${escapeHtml(paymentId)}</span>`
    : `&#8377;${amount}`;
  const refundUrl = escapeHtml(`${appUrl()}/refund-policy`);

  const bodyHtml = `
          <tr>
            <td style="padding:0 24px;">
              ${emailLogoHtml()}
            </td>
          </tr>

          <tr>
            <td style="padding:20px 24px 0 24px;">
              ${emailBadge("YOU'RE IN")}
            </td>
          </tr>

          <tr>
            <td style="padding:16px 24px 4px 24px;">
              <span style="font-family:'Space Grotesk',Arial,sans-serif;font-size:26px;font-weight:600;color:${BRAND.text};line-height:1.3;">
                See you at the jam &mdash; ${title}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:6px 24px 24px 24px;">
              <span style="font-size:14px;font-weight:400;color:${BRAND.textBody};line-height:1.6;">
                Hosted by <span style="color:${BRAND.primary};font-weight:500;">${host}</span>. You&rsquo;ve committed your spot &mdash; real rooms, real music.
              </span>
            </td>
          </tr>

          ${emailDivider()}

          <tr>
            <td style="padding:20px 24px 0 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:14px;font-size:13px;font-weight:400;color:${BRAND.textBodySoft};width:110px;vertical-align:top;">When</td>
                  <td style="padding-bottom:14px;font-size:14px;font-weight:400;color:${BRAND.textEmphasis};">${schedule}</td>
                </tr>
                <tr>
                  <td style="padding-bottom:14px;font-size:13px;font-weight:400;color:${BRAND.textBodySoft};vertical-align:top;">Where</td>
                  <td style="padding-bottom:14px;font-size:14px;font-weight:400;color:${BRAND.textEmphasis};">${address}<br><span style="color:${BRAND.textBody};font-size:13px;">${city}</span></td>
                </tr>
                <tr>
                  <td style="padding-bottom:14px;font-size:13px;font-weight:400;color:${BRAND.textBodySoft};vertical-align:top;">Join fee</td>
                  <td style="padding-bottom:14px;font-size:14px;font-weight:400;color:${BRAND.textEmphasis};">${paymentLine}</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:12px 24px 0 24px;">
              ${emailPrimaryButton(safeEventUrl, 'View jam details')}
            </td>
          </tr>

          <tr>
            <td style="padding:0 24px 0 24px;">
              <div style="border-top:1px solid ${BRAND.border};padding-top:16px;">
                <span style="font-size:12px;font-weight:400;color:${BRAND.textBodySoft};line-height:1.65;">
                  The exact address is private &mdash; please don&rsquo;t share it publicly. If plans change, leave through the app while the jam is still open for a partial refund. See our <a href="${refundUrl}" style="color:${BRAND.textBody};text-decoration:underline;">refund policy</a> for details.
                </span>
              </div>
            </td>
          </tr>
  `;

  return emailShell({
    title: `Alivestage — You're in: ${title}`,
    preheader: `You're confirmed for ${title}. See you at the jam.`,
    width: 560,
    bodyHtml,
  });
}

function jamCancelledEmailHtml({ event, profileName, eventUrl, refundAmount = 50 }) {
  const title = escapeHtml(event.title);
  const name = escapeHtml(profileName || 'there');
  const city = escapeHtml(event.city);
  const safeEventUrl = escapeHtml(eventUrl);
  const amount = Number(refundAmount) || 50;
  const browseUrl = escapeHtml(`${appUrl()}/events`);

  const bodyHtml = `
          <tr>
            <td style="padding:0 24px;">
              ${emailLogoHtml()}
            </td>
          </tr>

          <tr>
            <td style="padding:20px 24px 0 24px;">
              ${emailBadge('JAM CANCELLED')}
            </td>
          </tr>

          <tr>
            <td style="padding:16px 24px 4px 24px;">
              <span style="font-family:'Space Grotesk',Arial,sans-serif;font-size:26px;font-weight:600;color:${BRAND.text};line-height:1.3;">
                This jam won&rsquo;t happen
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:6px 24px 24px 24px;">
              <span style="font-size:14px;font-weight:400;color:${BRAND.textBody};line-height:1.6;">
                Hi ${name}, the host cancelled <span style="color:${BRAND.textEmphasis};font-weight:500;">${title}</span> in ${city}. Your &#8377;${amount} join fee has been fully refunded.
              </span>
            </td>
          </tr>

          ${emailDivider()}

          <tr>
            <td style="padding:24px 24px 8px 24px;">
              <span style="font-size:14px;font-weight:400;color:${BRAND.textBody};line-height:1.6;">
                There are other jams happening near you. Browse the feed and find your next session.
              </span>
            </td>
          </tr>

          <tr>
            <td style="padding:12px 24px 0 24px;">
              ${emailPrimaryButton(browseUrl, 'Browse jams')}
              &nbsp;&nbsp;
              <a href="${safeEventUrl}" style="font-family:Inter,Arial,sans-serif;font-size:14px;font-weight:500;color:${BRAND.textBody};text-decoration:underline;">View jam page</a>
            </td>
          </tr>
  `;

  return emailShell({
    title: `Alivestage — Jam cancelled: ${title}`,
    preheader: `${title} was cancelled. Your ₹${amount} join fee has been fully refunded.`,
    width: 560,
    bodyHtml,
  });
}

function ratingPromptEmailHtml({ event, profileName, rateUrl }) {
  const title = escapeHtml(event.title);
  const name = escapeHtml(profileName || 'there');
  const safeRateUrl = escapeHtml(rateUrl);

  const bodyHtml = `
          <tr>
            <td style="padding:0 24px;">
              ${emailLogoHtml()}
            </td>
          </tr>

          <tr>
            <td style="padding:20px 24px 0 24px;">
              ${emailEyebrow('Honest attendance')}
            </td>
          </tr>

          <tr>
            <td style="padding:12px 24px 4px 24px;">
              <span style="font-family:'Space Grotesk',Arial,sans-serif;font-size:26px;font-weight:600;color:${BRAND.text};line-height:1.3;">
                How was the jam?
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:6px 24px 24px 24px;">
              <span style="font-size:14px;font-weight:400;color:${BRAND.textBody};line-height:1.6;">
                Hi ${name}, please rate the people you jammed with at <span style="color:${BRAND.textEmphasis};font-weight:500;">${title}</span>. Ratings help the community know who shows up and plays fair.
              </span>
            </td>
          </tr>

          ${emailDivider()}

          <tr>
            <td style="padding:24px 24px 8px 24px;">
              <span style="font-size:14px;font-weight:400;color:${BRAND.textBody};line-height:1.6;">
                The rating window closes soon. It only takes a minute.
              </span>
            </td>
          </tr>

          <tr>
            <td style="padding:12px 24px 0 24px;">
              ${emailPrimaryButton(safeRateUrl, 'Rate your jam')}
            </td>
          </tr>
  `;

  return emailShell({
    title: `Alivestage — Rate your jam: ${title}`,
    preheader: `Rate the people you jammed with at ${title}. The window closes soon.`,
    width: 560,
    bodyHtml,
  });
}

module.exports = {
  escapeHtml,
  formatEventWhen,
  emailLogoHtml,
  otpEmailHtml,
  joinConfirmedEmailHtml,
  jamCancelledEmailHtml,
  ratingPromptEmailHtml,
};
