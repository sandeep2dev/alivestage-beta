/** Short-lived Razorpay order → event/join drafts (no pending DB rows). */
const TTL_MS = 30 * 60 * 1000;

/** @type {Map<string, { payload: object, expiresAt: number }>} */
const store = new Map();

function prune() {
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    if (value.expiresAt <= now) store.delete(key);
  }
}

function saveDraft(orderId, payload) {
  prune();
  store.set(String(orderId), {
    payload,
    expiresAt: Date.now() + TTL_MS,
  });
}

function peekDraft(orderId) {
  prune();
  const entry = store.get(String(orderId));
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    store.delete(String(orderId));
    return null;
  }
  return entry.payload;
}

function takeDraft(orderId) {
  const payload = peekDraft(orderId);
  if (payload) store.delete(String(orderId));
  return payload;
}

module.exports = { saveDraft, peekDraft, takeDraft };
