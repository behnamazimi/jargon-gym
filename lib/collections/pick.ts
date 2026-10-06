type Pickable = {
  slug: string;
  term: string;
  category: string | null;
  definition: string;
  example: string | null;
};

// Long definitions don't fit the large specimen type.
const SPECIMEN_MAX_DEFINITION = 140;

/** FNV-1a: a stable number from a string, so a page picks the same term on every build. */
function hash(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** The term that stands for a collection: the pinned one if it exists, otherwise a stable pick
 *  among short terms that have an example, otherwise among all of them. */
export function pickSpecimen<T extends Pickable>(
  collectionSlug: string,
  terms: readonly T[],
  pinnedSlug?: string,
): T | undefined {
  const pinned = pinnedSlug ? terms.find((term) => term.slug === pinnedSlug) : undefined;
  if (pinned) return pinned;

  const sorted = [...terms].sort((a, b) => a.slug.localeCompare(b.slug));
  const good = sorted.filter(
    (term) => term.example && term.definition.length <= SPECIMEN_MAX_DEFINITION,
  );
  const pool = good.length > 0 ? good : sorted;
  return pool.length > 0 ? pool[hash(collectionSlug) % pool.length] : undefined;
}
