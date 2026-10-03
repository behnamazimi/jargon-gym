import { generateUniqueSlug, slugify } from "@/lib/terms/slug";

export type SlugCheck = {
  valid: boolean;
  /** What the text turns into. */
  slug: string;
  taken: boolean;
  /** The next free one, when the wanted slug is taken. */
  suggestion: string | null;
  /** The text was longer than a slug can be, and was cut. */
  cut: boolean;
};

const MAX_SLUG = 100;

/** What a typed address would become, and whether it is free. Text with no letters or digits
 *  is not valid (it would otherwise quietly become "item"). */
export function resolveSlug(raw: string, taken: ReadonlySet<string>): SlugCheck {
  const full = slugify(raw);
  const slug = full.slice(0, MAX_SLUG).replace(/-+$/, "");
  if (!slug) return { valid: false, slug: "", taken: false, suggestion: null, cut: false };

  const isTaken = taken.has(slug);
  return {
    valid: true,
    slug,
    taken: isTaken,
    suggestion: isTaken ? generateUniqueSlug(slug, taken) : null,
    cut: full.length > MAX_SLUG,
  };
}

/** What to tell the admin about a check. */
export function describeSlugCheck(check: SlugCheck): string {
  if (!check.valid) return "Use letters or numbers in the address.";
  if (check.taken) return `/j/${check.slug} is taken. Try /j/${check.suggestion}.`;
  return `/j/${check.slug} is free.${check.cut ? " It was cut to fit." : ""}`;
}
