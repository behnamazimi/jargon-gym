/**
 * Optional hand-written extras for a public collection page, by slug. Every
 * public collection works without an entry; add one only when a line of copy or
 * a pinned term makes the page clearly better.
 */
type ShowcaseOverride = {
  /** Replaces the collection name as the page heading. */
  headline?: string;
  /** Who the collection is for, shown under the description. */
  audience?: string;
  /** The term that stands for the collection on the index and in share images. */
  specimenTermSlug?: string;
};

const OVERRIDES: Partial<Record<string, ShowcaseOverride>> = {
  standup: {
    audience: "For anyone joining an agile team: engineers, PMs, designers.",
  },
  "software-engineering": {
    audience: "For developers early in their career, and anyone who works closely with them.",
  },
  "agentic-development": {
    audience: "For developers starting to build with AI agents and coding assistants.",
  },
};

export function showcaseOverride(slug: string): ShowcaseOverride {
  return OVERRIDES[slug] ?? {};
}
