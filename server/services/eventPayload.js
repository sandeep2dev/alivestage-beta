const { normalizeDescriptionForStorage } = require('./richText');

function computeEndAt(startAt, durationMinutes) {
  return new Date(new Date(startAt).getTime() + Number(durationMinutes) * 60 * 1000);
}

function parseCoord(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function validateEventPayload(body, { allowPastStart = false, requireVenueCoords = true } = {}) {
  const title = String(body?.title || '').trim();
  const summary = String(body?.summary || '').trim();
  const city = String(body?.city || '').trim();
  const preciseAddress = String(body?.precise_address || body?.preciseAddress || '').trim();
  const venueLat = parseCoord(body?.venue_lat ?? body?.venueLat);
  const venueLng = parseCoord(body?.venue_lng ?? body?.venueLng);
  const startAt = body?.start_at || body?.startAt;
  const durationMinutes = Number(body?.duration_minutes ?? body?.durationMinutes);

  const descriptionResult = normalizeDescriptionForStorage(body?.description ?? '');
  if (!descriptionResult.ok) {
    return { ok: false, message: descriptionResult.message };
  }

  if (title.length < 3 || title.length > 120) {
    return { ok: false, message: 'Title must be 3–120 characters' };
  }
  if (summary.length < 10 || summary.length > 280) {
    return { ok: false, message: 'Summary must be 10–280 characters' };
  }
  if (city.length < 2) {
    return { ok: false, message: 'City is required' };
  }
  if (preciseAddress.length < 5) {
    return { ok: false, message: 'Precise address is required' };
  }
  if (Number.isNaN(venueLat) || Number.isNaN(venueLng)) {
    return { ok: false, message: 'Invalid venue coordinates' };
  }
  if (requireVenueCoords && (venueLat == null || venueLng == null)) {
    return { ok: false, message: 'Drop a pin on the map to confirm the exact venue location' };
  }
  if (venueLat != null && venueLng != null) {
    if (venueLat < -90 || venueLat > 90 || venueLng < -180 || venueLng > 180) {
      return { ok: false, message: 'Invalid venue coordinates' };
    }
  }
  if (!startAt || Number.isNaN(new Date(startAt).getTime())) {
    return { ok: false, message: 'Valid start time is required' };
  }
  if (!Number.isFinite(durationMinutes) || durationMinutes < 30 || durationMinutes > 24 * 60) {
    return { ok: false, message: 'Duration must be between 30 and 1440 minutes' };
  }
  if (!allowPastStart && new Date(startAt).getTime() < Date.now() - 60 * 1000) {
    return { ok: false, message: 'Start time must be in the future' };
  }

  const value = {
    title,
    summary,
    description: descriptionResult.html,
    city,
    precise_address: preciseAddress,
    start_at: new Date(startAt).toISOString(),
    duration_minutes: durationMinutes,
    end_at: computeEndAt(startAt, durationMinutes).toISOString(),
  };

  if (venueLat != null && venueLng != null) {
    value.venue_lat = venueLat;
    value.venue_lng = venueLng;
  }

  return { ok: true, value };
}

module.exports = {
  validateEventPayload,
  parseCoord,
  computeEndAt,
};
