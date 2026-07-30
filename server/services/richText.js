const sanitizeHtml = require('sanitize-html');
const crypto = require('crypto');

const MAX_DESCRIPTION_LENGTH = 50000;

function eventImagesPublicPrefix() {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  if (!base) return null;
  return `${base}/storage/v1/object/public/event-images/`;
}

function isAllowedImageSrc(src) {
  const prefix = eventImagesPublicPrefix();
  if (!prefix || !src) return false;
  return String(src).startsWith(prefix);
}

function sanitizeDescriptionHtml(input) {
  const raw = String(input || '').trim();
  if (!raw) return '';

  const prefix = eventImagesPublicPrefix();

  const cleaned = sanitizeHtml(raw, {
    allowedTags: [
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
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'title'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', {
        target: '_blank',
        rel: 'noopener noreferrer',
      }),
      img: (tagName, attribs) => {
        if (!isAllowedImageSrc(attribs.src)) {
          return { tagName: '', text: '' };
        }
        return {
          tagName: 'img',
          attribs: {
            src: attribs.src,
            alt: attribs.alt || '',
          },
        };
      },
    },
  });

  if (cleaned.length > MAX_DESCRIPTION_LENGTH) {
    return { ok: false, message: 'Description is too long' };
  }

  return { ok: true, html: cleaned };
}

/** Plain-text legacy descriptions → safe HTML paragraphs. */
function plainTextToHtml(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return '';
  const escaped = sanitizeHtml(trimmed, { allowedTags: [], allowedAttributes: {} });
  const paragraphs = escaped.split(/\n{2,}/).map((block) => {
    const inner = block.replace(/\n/g, '<br>');
    return `<p>${inner}</p>`;
  });
  return paragraphs.join('');
}

function normalizeDescriptionForStorage(input) {
  const trimmed = String(input || '').trim();
  if (!trimmed) return { ok: true, html: '' };

  const looksLikeHtml = trimmed.startsWith('<') && /<\/[a-z]/i.test(trimmed);
  if (looksLikeHtml) {
    return sanitizeDescriptionHtml(trimmed);
  }

  const html = plainTextToHtml(trimmed);
  if (html.length > MAX_DESCRIPTION_LENGTH) {
    return { ok: false, message: 'Description is too long' };
  }
  return { ok: true, html };
}

function normalizeDescriptionForDisplay(input) {
  const trimmed = String(input || '').trim();
  if (!trimmed) return '';

  const looksLikeHtml = trimmed.startsWith('<') && /<\/[a-z]/i.test(trimmed);
  if (looksLikeHtml) {
    const result = sanitizeDescriptionHtml(trimmed);
    return result.ok ? result.html : '';
  }
  return plainTextToHtml(trimmed);
}

function eventImagePath(userId, ext) {
  const id = crypto.randomUUID();
  return `${userId}/${id}.${ext}`;
}

module.exports = {
  MAX_DESCRIPTION_LENGTH,
  eventImagesPublicPrefix,
  sanitizeDescriptionHtml,
  normalizeDescriptionForStorage,
  normalizeDescriptionForDisplay,
  eventImagePath,
};
