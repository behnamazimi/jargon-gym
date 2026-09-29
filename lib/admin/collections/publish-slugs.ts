import { generateUniqueSlug } from "@/lib/jargon/slug";

type TermForSlug = { id: string; term: string; slug: string | null };

/** Slugs for publishing a collection: only what is missing. The domain keeps
 *  the slug it has; terms that already have one are left alone and reserved. */
export function buildPublishSlugs(input: {
  domainName: string;
  domainSlug: string | null;
  /** Slugs used by other collections, including ones the admin can't read. */
  takenDomainSlugs: ReadonlySet<string>;
  terms: TermForSlug[];
}): { domainSlug: string; termSlugs: Record<string, string> } {
  const domainSlug =
    input.domainSlug || generateUniqueSlug(input.domainName, input.takenDomainSlugs);

  const taken = new Set(input.terms.flatMap((term) => (term.slug ? [term.slug] : [])));
  const termSlugs: Record<string, string> = {};
  for (const term of input.terms) {
    if (term.slug) continue;
    const slug = generateUniqueSlug(term.term, taken);
    taken.add(slug);
    termSlugs[term.id] = slug;
  }
  return { domainSlug, termSlugs };
}
