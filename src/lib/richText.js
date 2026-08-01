import DOMPurify from 'isomorphic-dompurify';

function eventImagesPublicPrefix() {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  if (!base) return null;
  return `${base}/storage/v1/object/public/event-images/`;
}

let hooksConfigured = false;

function configurePurify() {
  if (hooksConfigured || typeof window === 'undefined') return;
  const prefix = eventImagesPublicPrefix();
  DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
    if (data.attrName === 'src' && node.tagName === 'IMG') {
      if (!prefix || !String(data.attrValue).startsWith(prefix)) {
        data.keepAttr = false;
      }
    }
  });
  hooksConfigured = true;
}

function looksLikeHtml(value) {
  const trimmed = String(value || '').trim();
  return trimmed.startsWith('<') && /<\/[a-z]/i.test(trimmed);
}

function plainTextToHtml(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return '';
  const escaped = trimmed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return escaped
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export function sanitizeDescriptionHtml(html) {
  configurePurify();
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'b',
      'em',
      'i',
      'u',
      'a',
      'ul',
      'ol',
      'li',
      'h2',
      'h3',
      'blockquote',
      'img',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title'],
    ALLOW_DATA_ATTR: false,
  });
}

export function prepareDescriptionForDisplay(input) {
  const trimmed = String(input || '').trim();
  if (!trimmed) return '';
  const html = looksLikeHtml(trimmed) ? trimmed : plainTextToHtml(trimmed);
  return sanitizeDescriptionHtml(html);
}

export async function uploadEventImage(file) {
  const { imageToUploadPayload } = await import('@/lib/image');
  const { apiFetch } = await import('@/lib/api');
  const { getAccessToken } = await import('@/lib/auth');

  const payload = await imageToUploadPayload(file, { maxSizeMB: 1, maxWidthOrHeight: 1600 });
  const token = getAccessToken();
  const data = await apiFetch('/api/events/upload-image', {
    method: 'POST',
    token,
    body: payload,
  });
  return data.url;
}
