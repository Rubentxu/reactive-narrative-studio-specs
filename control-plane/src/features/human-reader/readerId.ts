/**
 * Anonymous reader identity (M11, docs/22-SECURITY-RIGHTS.md child-reader privacy).
 *
 * The reader id is an auto-generated hex token kept in sessionStorage only:
 * - no PII is collected or derivable from it;
 * - it resets when the tab closes (no cross-session carry-over);
 * - it is never written to localStorage/IndexedDB.
 */

const STORAGE_KEY = 'human-reader-uat.readerId';

function generateReaderId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function getOrCreateReaderId(storage: Storage | undefined = typeof sessionStorage !== 'undefined' ? sessionStorage : undefined): string {
  if (!storage) return generateReaderId();
  const existing = storage.getItem(STORAGE_KEY);
  if (existing && /^[0-9a-f]{16}$/.test(existing)) return existing;
  const created = generateReaderId();
  storage.setItem(STORAGE_KEY, created);
  return created;
}

export function newRoundId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '');
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
