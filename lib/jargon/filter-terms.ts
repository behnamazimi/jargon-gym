import type { FilterOptions, LibraryTerm, SortMode } from "./types";

export function getCategories(terms: Pick<LibraryTerm, "category">[]): string[] {
  return [...new Set(terms.flatMap((t) => (t.category ? [t.category] : [])))];
}

export function getCategoryCounts(terms: Pick<LibraryTerm, "category">[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const term of terms) {
    if (!term.category) continue;
    counts[term.category] = (counts[term.category] ?? 0) + 1;
  }
  return counts;
}

export function filterTerms<T extends LibraryTerm>(terms: T[], options: FilterOptions): T[] {
  const { searchQuery, activeCategories, hideKnown, sortMode, knownTerms, markedKnownTerms } =
    options;

  let list = terms.filter((t) => {
    if (activeCategories.size > 0 && !(t.category && activeCategories.has(t.category)))
      return false;
    if (hideKnown && (knownTerms.has(t.id) || markedKnownTerms.has(t.id))) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!t.term.toLowerCase().includes(q) && !t.definition.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  list = sortTerms(list, sortMode, knownTerms, markedKnownTerms);
  return list;
}

/** Terms without a category sort after every named one. */
function categoryRank(category: string | null): string {
  return category ? `0${category}` : "1";
}

function sortTerms<T extends LibraryTerm>(
  terms: T[],
  sortMode: SortMode,
  knownTerms: Set<string>,
  markedKnownTerms: Set<string>,
): T[] {
  if (sortMode === "category") {
    return [...terms].sort(
      (a, b) =>
        categoryRank(a.category).localeCompare(categoryRank(b.category)) ||
        a.term.localeCompare(b.term),
    );
  }
  if (sortMode === "az") {
    return [...terms].sort((a, b) => a.term.localeCompare(b.term));
  }
  if (sortMode === "unknown") {
    return [...terms].sort((a, b) => {
      const aKnown = knownTerms.has(a.id) || markedKnownTerms.has(a.id);
      const bKnown = knownTerms.has(b.id) || markedKnownTerms.has(b.id);
      if (aKnown !== bKnown) return aKnown ? 1 : -1;
      return a.term.localeCompare(b.term);
    });
  }
  return terms;
}
