import type { SortMode } from "./types";

const STORAGE_KEY = "jargon-gym:library-filters:v1";

const SORT_MODES: readonly SortMode[] = ["default", "category", "az", "unknown"];

/** Library filter choices remembered on this device. Categories are kept
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

/** Raw stored string, so useSyncExternalStore gets a stable snapshot. */
export function loadLibraryFiltersSnapshot(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function subscribeLibraryFilters(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);

  function onStorage(event: StorageEvent) {
    if (event.key === STORAGE_KEY || event.key === null) onStoreChange();
  }

  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function updateLibraryFilters(update: (prev: LibraryFilters) => LibraryFilters): void {
  const next = update(parseLibraryFilters(loadLibraryFiltersSnapshot()));
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore quota errors or private browsing restrictions.
  }
  for (const listener of listeners) listener();
}
