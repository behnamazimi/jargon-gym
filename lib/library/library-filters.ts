import type { SortMode } from "@/lib/terms/types";

/** Read by the server too, so the first render is already filtered. */
const LIBRARY_FILTERS_COOKIE = "lb_lib_filters";

const SORT_MODES: readonly SortMode[] = ["default", "category", "az", "unknown"];

/** Library filter choices remembered on this device (in a cookie). Categories are kept
 *  per collection, since each collection has its own. */
export type LibraryFilters = {
  hideKnown: boolean;
  sortMode: SortMode;
  categoriesByCollection: Record<string, string[]>;
};

const DEFAULT_LIBRARY_FILTERS: LibraryFilters = {
  hideKnown: false,
  sortMode: "default",
  categoriesByCollection: {},
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

    const categoriesByCollection: Record<string, string[]> = {};
    if (record.categoriesByCollection && typeof record.categoriesByCollection === "object") {
      for (const [collectionId, categories] of Object.entries(record.categoriesByCollection)) {
        if (isStringArray(categories)) categoriesByCollection[collectionId] = categories;
      }
    }

    return {
      hideKnown: record.hideKnown === true,
      sortMode: SORT_MODES.find((mode) => mode === record.sortMode) ?? "default",
      categoriesByCollection,
    };
  } catch {
    return DEFAULT_LIBRARY_FILTERS;
  }
}

/** Most recent collections whose category choice is kept. */
const MAX_REMEMBERED_COLLECTIONS = 20;
/** Browsers drop a cookie over 4 KB, name and attributes included. */
const MAX_COOKIE_VALUE_LENGTH = 3500;

/** The cookie value (URI-encoded JSON). Empty category choices are dropped,
 *  and the least recently changed collections go first (last keys win) until
 *  it fits, since category names can encode to many bytes each. */
export function serializeLibraryFilters(filters: LibraryFilters): string {
  const entries = Object.entries(filters.categoriesByCollection)
    .filter(([, categories]) => categories.length > 0)
    .slice(-MAX_REMEMBERED_COLLECTIONS);
  for (;;) {
    const value = encodeURIComponent(
      JSON.stringify({ ...filters, categoriesByCollection: Object.fromEntries(entries) }),
    );
    if (value.length <= MAX_COOKIE_VALUE_LENGTH || entries.length === 0) return value;
    entries.shift();
  }
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

/** This tab's choices once it has changed any. They stay complete even when
 *  the cookie had to leave some collections out. */
let changedInThisTab: string | null = null;

/** A raw string, so useSyncExternalStore gets a stable snapshot. */
export function loadLibraryFiltersSnapshot(): string {
  return changedInThisTab ?? readLibraryFiltersCookie(document.cookie);
}

export function subscribeLibraryFilters(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function updateLibraryFilters(update: (prev: LibraryFilters) => LibraryFilters): void {
  const next = update(decodeLibraryFilters(loadLibraryFiltersSnapshot()));
  changedInThisTab = encodeURIComponent(JSON.stringify(next));
  document.cookie = `${LIBRARY_FILTERS_COOKIE}=${serializeLibraryFilters(next)}; path=/; max-age=31536000; samesite=lax`;
  for (const listener of listeners) listener();
}
