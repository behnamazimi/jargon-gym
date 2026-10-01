const DEFAULT_CATEGORY = "General";

function termKey(term: string) {
  return term.trim().toLowerCase();
}

/** The term already in the collection under this name. Same rule as the
 *  unique index: case and surrounding spaces don't count, accents do. */
export function findDuplicateTerm<T extends { term: string }>(
  input: string,
  terms: T[],
): T | undefined {
  const key = termKey(input);
  if (!key) return undefined;
  return terms.find((candidate) => termKey(candidate.term) === key);
}

/** The category most terms already use, so a new term lands in it by default.
 *  Ties go to the alphabetically first one. */
export function mostUsedCategory(terms: { category: string }[]): string {
  const counts = new Map<string, number>();
  for (const { category } of terms) {
    const name = category.trim();
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  let best: string | null = null;
  for (const [name, count] of counts) {
    const bestCount = best === null ? 0 : (counts.get(best) ?? 0);
    if (count > bestCount || (count === bestCount && best !== null && name < best)) best = name;
  }

  return best ?? DEFAULT_CATEGORY;
}
