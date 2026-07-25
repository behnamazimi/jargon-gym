import type { FilterOptions, SortMode, Term } from "./types";

export function getCategories(terms: Term[]): string[] {
  return [...new Set(terms.map((t) => t.category))];
}

export function getCategoryCounts(terms: Term[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const term of terms) {
    counts[term.category] = (counts[term.category] ?? 0) + 1;
  }
  return counts;
}

export function filterTerms(terms: Term[], options: FilterOptions): Term[] {
  const { searchQuery, activeCategories, hideKnown, sortMode, knownTerms } = options;

  let list = terms.filter((t) => {
    if (activeCategories.size > 0 && !activeCategories.has(t.category)) return false;
    if (hideKnown && knownTerms.has(t.id)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!t.term.toLowerCase().includes(q) && !t.definition.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  list = sortTerms(list, sortMode, knownTerms);
  return list;
}

function sortTerms(terms: Term[], sortMode: SortMode, knownTerms: Set<string>): Term[] {
  if (sortMode === "az") {
    return [...terms].sort((a, b) => a.term.localeCompare(b.term));
  }
  if (sortMode === "unknown") {
    return [...terms].sort((a, b) => {
      const aKnown = knownTerms.has(a.id);
      const bKnown = knownTerms.has(b.id);
      if (aKnown !== bKnown) return aKnown ? 1 : -1;
      return a.term.localeCompare(b.term);
    });
  }
  return terms;
}
