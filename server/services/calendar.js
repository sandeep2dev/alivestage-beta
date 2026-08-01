const crypto = require('crypto');
const { appUrl } = require('./cancelEvent');

function calendarSignature(eventId, userId) {
  const secret = process.env.JWT_SECRET || 'alivestage-dev';
  return crypto.createHmac('sha256', secret).update(`${eventId}:${userId}`).digest('hex').slice(0, 24);
}

function verifyCalendarSignature(eventId, userId, sig) {
  if (!eventId || !userId || !sig) return false;
  const expected = calendarSignature(eventId, userId);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(sig)));
  } catch {
    return false;
  }
}

function calendarUrl(eventId, userId) {
  const sig = calendarSignature(eventId, userId);
  return `${appUrl()}/api/events/${eventId}/calendar.ics?u=${encodeURIComponent(userId)}&sig=${sig}`;
}

function escapeIcs(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function formatIcsDate(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function buildEventIcs(event, { location = '' } = {}) {
  const start = new Date(event.start_at);
  const end = event.end_at
    ? new Date(event.end_at)
    : new Date(start.getTime() + (Number(event.duration_minutes) || 120) * 60 * 1000);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Alivestage//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeIcs(`${event.id}@alivestage.com`)}`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(event.summary || event.description || '')}`,
  ];

  if (location) {
    lines.push(`LOCATION:${escapeIcs(location)}`);
  }

  lines.push('END:VEVENT', 'END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

module.exports = {
  calendarUrl,
  verifyCalendarSignature,
  buildEventIcs,
};
