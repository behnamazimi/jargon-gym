const COLLECTION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function writePreferenceCookie(name: string, value: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COLLECTION_COOKIE_MAX_AGE}; SameSite=Lax`;
}

function clearPreferenceCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

export function isCollectionPreference(value: unknown): value is string {
  return typeof value === "string" && (value === "all" || UUID_RE.test(value));
}

/** A per-device "last collection" cookie for a study surface. Written in
 *  the browser, read by the page on the server so the first render
 *  already uses it. The value is `"all"` or a collection UUID; anything
 *  else is ignored. */
export function createCollectionPreference(cookieName: string) {
  return {
    cookieName,
    parse(value: string | undefined): string | null {
      if (!value) return null;
      let decoded: string;
      try {
        decoded = decodeURIComponent(value);
      } catch {
        return null;
      }
      return isCollectionPreference(decoded) ? decoded : null;
    },
    save(collectionId: string): void {
      writePreferenceCookie(cookieName, collectionId);
    },
    clear(): void {
      clearPreferenceCookie(cookieName);
    },
  };
}

/** Picks the collection a study page opens on: a valid `?collection=` first,
 *  then the remembered one if it's still active, else "all". A remembered
 *  collection that's paused or gone is skipped, not forgotten — it comes
 *  back if the collection is resumed. */
export function resolveStudyCollectionId(
  collectionParam: string | undefined,
  rememberedId: string | null,
  activeIds: string[],
): string {
  if (collectionParam && activeIds.includes(collectionParam)) return collectionParam;
  if (rememberedId && (rememberedId === "all" || activeIds.includes(rememberedId))) {
    return rememberedId;
  }
  return "all";
}
