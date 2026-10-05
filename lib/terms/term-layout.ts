import type { Term } from "@/lib/terms/types";

/** The parts of a term's body a learner can move under "More". The
 *  definition is not one of them: it is always shown. */
export const TERM_BLOCKS = [
  "mentalModel",
  "example",
  "antiExample",
  "discussion",
  "controversy",
  "note",
  "relationships",
  "searchLink",
] as const;

export type TermBlock = (typeof TERM_BLOCKS)[number];
type BlockPlacement = "shown" | "more";
export type Placement = Record<TermBlock, BlockPlacement>;

/** Only the blocks moved under More are stored; a missing block is shown. */
export type PlacementOverrides = Partial<Record<TermBlock, "more">>;

export type TermLayout = {
  default: PlacementOverrides;
  collections: Record<string, PlacementOverrides>;
};

export const EMPTY_TERM_LAYOUT: TermLayout = { default: {}, collections: {} };

const MAX_COLLECTIONS = 100;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isBlock(value: string): value is TermBlock {
  return (TERM_BLOCKS as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseOverrides(value: unknown): PlacementOverrides {
  if (!isRecord(value)) return {};
  const overrides: PlacementOverrides = {};
  for (const [block, placement] of Object.entries(value)) {
    if (isBlock(block) && placement === "more") overrides[block] = "more";
  }
  return overrides;
}

/** Reads what the database holds, dropping anything it doesn't recognise. */
export function parseTermLayout(value: unknown): TermLayout {
  if (!isRecord(value)) return EMPTY_TERM_LAYOUT;
  const collections: Record<string, PlacementOverrides> = {};
  if (isRecord(value.collections)) {
    for (const [domainId, overrides] of Object.entries(value.collections).slice(
      0,
      MAX_COLLECTIONS,
    )) {
      if (UUID.test(domainId)) collections[domainId] = parseOverrides(overrides);
    }
  }
  return { default: parseOverrides(value.default), collections };
}

/** A full placement from the browser, or null when it isn't one. */
export function parsePlacement(value: unknown): Placement | null {
  if (!isRecord(value)) return null;
  const placement = {} as Placement;
  for (const block of TERM_BLOCKS) {
    const entry = value[block];
    if (entry !== "shown" && entry !== "more") return null;
    placement[block] = entry;
  }
  return placement;
}

export function isDomainId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

export function toPlacement(overrides: PlacementOverrides): Placement {
  const placement = {} as Placement;
  for (const block of TERM_BLOCKS) placement[block] = overrides[block] ?? "shown";
  return placement;
}

function toOverrides(placement: Placement): PlacementOverrides {
  const overrides: PlacementOverrides = {};
  for (const block of TERM_BLOCKS) {
    if (placement[block] === "more") overrides[block] = "more";
  }
  return overrides;
}

/** The collection's own map when it has one, else the default for all. */
export function resolvePlacement(layout: TermLayout, domainId: string | undefined): Placement {
  const own = domainId ? layout.collections[domainId] : undefined;
  return toPlacement(own ?? layout.default);
}

export function hasCollectionOverride(layout: TermLayout, domainId: string | undefined): boolean {
  return Boolean(domainId && layout.collections[domainId]);
}

export function withCollectionPlacement(
  layout: TermLayout,
  domainId: string,
  placement: Placement,
): TermLayout {
  return {
    ...layout,
    collections: { ...layout.collections, [domainId]: toOverrides(placement) },
  };
}

export function withoutCollectionPlacement(layout: TermLayout, domainId: string): TermLayout {
  const collections = { ...layout.collections };
  delete collections[domainId];
  return { ...layout, collections };
}

/** Leaves every collection's own map as it was. */
export function withDefaultPlacement(layout: TermLayout, placement: Placement): TermLayout {
  return { ...layout, default: toOverrides(placement) };
}

/** Whether a block has anything to show for this term. */
export function blockHasContent(
  block: TermBlock,
  term: Pick<
    Term,
    "mentalModel" | "example" | "antiExample" | "discussion" | "controversy" | "note"
  > & { relationships: readonly unknown[] },
  showSearchLink: boolean,
): boolean {
  if (block === "searchLink") return showSearchLink;
  if (block === "relationships") return term.relationships.length > 0;
  return Boolean(term[block]?.trim());
}

/** How many blocks sit under More for this term, so "More (n)" counts only
 *  what is actually there. */
export function moreCount(
  placement: Placement,
  term: Parameters<typeof blockHasContent>[1],
  showSearchLink: boolean,
): number {
  return TERM_BLOCKS.filter(
    (block) => placement[block] === "more" && blockHasContent(block, term, showSearchLink),
  ).length;
}
