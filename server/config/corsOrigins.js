/**
 * Allowed browser origins for CORS (credentials: true requires an exact match).
 * Accepts NEXT_PUBLIC_APP_URL plus its www / non-www twin, and optional CORS_ALLOWED_ORIGINS.
 */
function normalizeOrigin(value) {
  const trimmed = String(value || '').trim().replace(/\/$/, '');
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    return url.origin;
  } catch {
    return null;
  }
}

function wwwVariants(origin) {
  const variants = new Set();
  if (!origin) return variants;

  variants.add(origin);

  try {
    const url = new URL(origin);
    const { protocol, hostname, port } = url;
    const portSuffix = port ? `:${port}` : '';

    if (hostname.startsWith('www.')) {
      variants.add(`${protocol}//${hostname.slice(4)}${portSuffix}`);
    } else if (hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '::1') {
      variants.add(`${protocol}//www.${hostname}${portSuffix}`);
    }
  } catch {
    // ignore malformed URLs
  }

  return variants;
}

function getAllowedOrigins() {
  const origins = new Set();

  for (const origin of wwwVariants(normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL))) {
    origins.add(origin);
  }

  const extras = String(process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((part) => normalizeOrigin(part))
    .filter(Boolean);

  for (const extra of extras) {
    for (const origin of wwwVariants(extra)) {
      origins.add(origin);
    }
  }

  if (origins.size === 0) {
    origins.add('http://localhost:3000');
  }

  return [...origins];
}

function createCorsOriginChecker() {
  const allowed = new Set(getAllowedOrigins());

  return function checkOrigin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    const normalized = normalizeOrigin(origin);
    if (normalized && allowed.has(normalized)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked for origin: ${origin}`));
  };
}

module.exports = {
  getAllowedOrigins,
  createCorsOriginChecker,
};
