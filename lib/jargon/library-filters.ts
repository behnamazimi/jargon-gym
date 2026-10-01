import type { SortMode } from "./types";

/** Read by the server too, so the first render is already filtered. */
const LIBRARY_FILTERS_COOKIE = "jg_lib_filters";

const SORT_MODES: readonly SortMode[] = ["default", "category", "az", "unknown"];

/** Library filter choices remembered on this device (in a cookie). Categories are kept
 *  per collection, since each collection has its own. */
export type LibraryFilters = {
  hideKnown: boolean;
  sortMode: SortMode;
  categoriesByDomain: Record<string, string[]>;
};

const DEFAULT_LIBRARY_FILTERS: LibraryFilters = {
  hideKnown: false,
  sortMode: "default",
  categoriesByDomain: {},
};

const listeners = new Set<() => void>();

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function parseLibraryFilters(raw: string | null): LibraryFilters {
  if (!raw) return DEFAULT_LIBRARY_FILTERS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return DEFAULT_LIBRARY_FILTERS;
    const record = parsed as Record<string, unknown>;

    const categoriesByDomain: Record<string, string[]> = {};
    if (record.categoriesByDomain && typeof record.categoriesByDomain === "object") {
      for (const [domainId, categories] of Object.entries(record.categoriesByDomain)) {
        if (isStringArray(categories)) categoriesByDomain[domainId] = categories;
      }
    }

    return {
      hideKnown: record.hideKnown === true,
      sortMode: SORT_MODES.find((mode) => mode === record.sortMode) ?? "default",
      categoriesByDomain,
    };
  } catch {
    return DEFAULT_LIBRARY_FILTERS;
  }
}

/** Most recent collections whose category choice is kept, so the cookie
 *  stays well under the browser's 4 KB limit. */
const MAX_REMEMBERED_DOMAINS = 20;

/** Serialized for the cookie: empty category choices are dropped and only
 *  the most recently changed collections are kept (last keys win). */
export function serializeLibraryFilters(filters: LibraryFilters): string {
  const entries = Object.entries(filters.categoriesByDomain).filter(
    ([, categories]) => categories.length > 0,
  );
  return JSON.stringify({
    ...filters,
    categoriesByDomain: Object.fromEntries(entries.slice(-MAX_REMEMBERED_DOMAINS)),
  });
}

/** Raw cookie value as stored (URI-encoded JSON). */
export function readLibraryFiltersCookie(cookieHeader: string): string {
  const prefix = `${LIBRARY_FILTERS_COOKIE}=`;
  const entry = cookieHeader.split("; ").find((part) => part.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : "";
}

export function decodeLibraryFilters(raw: string): LibraryFilters {
  if (!raw) return DEFAULT_LIBRARY_FILTERS;
  try {
    return parseLibraryFilters(decodeURIComponent(raw));
  } catch {
    return DEFAULT_LIBRARY_FILTERS;
  }
}

/** Raw cookie string, so useSyncExternalStore gets a stable snapshot. */
export function loadLibraryFiltersSnapshot(): string {
  return readLibraryFiltersCookie(document.cookie);
}

export function subscribeLibraryFilters(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function updateLibraryFilters(update: (prev: LibraryFilters) => LibraryFilters): void {
  const next = update(decodeLibraryFilters(loadLibraryFiltersSnapshot()));
  const value = encodeURIComponent(serializeLibraryFilters(next));
  document.cookie = `${LIBRARY_FILTERS_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
  for (const listener of listeners) listener();
}
