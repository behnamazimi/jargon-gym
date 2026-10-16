import { writePreferenceCookie } from "@/lib/study/collection-preference";

const CARDS_PATH = "/app/read";
const STORIES_PATH = "/app/read/stories";

/** A per-device copy of the "Open Stories by default" option, so the proxy
 *  can send a plain visit to Stories without asking the database. Saving the
 *  option sets it, and the Cards and Stories pages correct it when the option
 *  was changed on another device. */
export const READ_LANDING_COOKIE = "lb-read-landing";

// Params that only mean something on Cards and aren't carried to Stories.
const CARDS_ONLY_PARAMS = new Set(["view", "termId", "alreadyRead"]);

export function readLandingCookieValue(storiesDefault: boolean): string {
  return storiesDefault ? "stories" : "cards";
}

export function hasReadLandingPreference(): boolean {
  return document.cookie.split("; ").some((pair) => pair.startsWith(`${READ_LANDING_COOKIE}=`));
}

export function saveReadLandingPreference(storiesDefault: boolean): void {
  writePreferenceCookie(READ_LANDING_COOKIE, readLandingCookieValue(storiesDefault));
}

/** Where a plain visit to /app/read should go instead of Cards, or null to
 *  stay. Only the Stories default sends it on; an explicit `view=cards` or a
 *  single-term link always stays. */
export function readLandingRedirect(
  pathname: string,
  searchParams: URLSearchParams,
  cookieValue: string | undefined,
): string | null {
  if (pathname !== CARDS_PATH || cookieValue !== "stories") return null;
  if (searchParams.get("view") === "cards" || searchParams.has("termId")) return null;

  const carried = new URLSearchParams();
  for (const [key, value] of searchParams) {
    if (!CARDS_ONLY_PARAMS.has(key)) carried.set(key, value);
  }
  const query = carried.toString();
  return query ? `${STORIES_PATH}?${query}` : STORIES_PATH;
}
