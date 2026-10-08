import { generateUniqueSlug } from "@/lib/terms/slug";

type TermForSlug = { id: string; term: string; slug: string | null };

/** Slugs for publishing a collection: only what is missing. The collection keeps
 *  the slug it has; terms that already have one are left alone and reserved. */
export function buildPublishSlugs(input: {
  collectionName: string;
  collectionSlug: string | null;
  /** Slugs used by other collections, including ones the admin can't read. */
  takenCollectionSlugs: ReadonlySet<string>;
  terms: TermForSlug[];
}): { collectionSlug: string; termSlugs: Record<string, string> } {
  const collectionSlug =
    input.collectionSlug || generateUniqueSlug(input.collectionName, input.takenCollectionSlugs);

  const taken = new Set(input.terms.flatMap((term) => (term.slug ? [term.slug] : [])));
  const termSlugs: Record<string, string> = {};
  for (const term of input.terms) {
    if (term.slug) continue;
    const slug = generateUniqueSlug(term.term, taken);
    taken.add(slug);
    termSlugs[term.id] = slug;
  }
  return { collectionSlug, termSlugs };
}
