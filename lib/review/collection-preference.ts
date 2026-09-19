export const REVIEW_COLLECTION_COOKIE = "jg-review-collection";
const REVIEW_COLLECTION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Cookie value is `"all"` or a collection UUID. Anything else is ignored. */
export function parseReviewCollectionCookie(value: string | undefined): string | null {
  if (!value) return null;
  const decoded = decodeURIComponent(value);
  if (decoded === "all") return "all";
  if (UUID_RE.test(decoded)) return decoded;
  return null;
}

export function saveReviewCollectionPreference(collectionId: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${REVIEW_COLLECTION_COOKIE}=${encodeURIComponent(collectionId)}; path=/; max-age=${REVIEW_COLLECTION_COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function clearReviewCollectionPreference(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${REVIEW_COLLECTION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}
