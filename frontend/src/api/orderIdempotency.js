// G3 — server-side order idempotency key lifecycle.
//
// Backend contract (POST /orders and /checkout require an Idempotency-Key):
//   - the key must represent ONE logical order submission;
//   - a network/double-click retry of the SAME submission reuses the key so
//     the server returns the ORIGINAL order instead of creating a duplicate;
//   - a genuinely NEW submission (payload/cart changed, or a prior success)
//     gets a NEW key;
//   - the server is the source of truth — this module only keeps the key
//     lifecycle correct on the client.
//
// Keys are held in memory only (no localStorage). The key is rotated when the
// logical submission signature changes and cleared after a successful order.

let currentKey = null;
let currentSignature = null;

function makeKey() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}

// Canonical, key-sorted JSON of the fields that identify the logical
// submission, so equivalent objects always produce the same signature.
export function orderSubmissionSignature(fields) {
  const sorted = {};
  for (const k of Object.keys(fields || {}).sort()) {
    sorted[k] = fields[k];
  }
  return JSON.stringify(sorted);
}

// Return the current key for a logical submission. Reuses the stored key when
// the submission signature is unchanged (retry of the same submission),
// otherwise generates a fresh one (new logical submission).
export function getOrderIdempotencyKey(signature) {
  if (currentKey && signature === currentSignature) {
    return currentKey;
  }
  currentSignature = signature ?? null;
  currentKey = makeKey();
  return currentKey;
}

// Clear the cached key after a successful order placement so the user's next
// genuine submission gets a fresh key.
export function rotateOrderIdempotencyKey() {
  currentKey = null;
  currentSignature = null;
}