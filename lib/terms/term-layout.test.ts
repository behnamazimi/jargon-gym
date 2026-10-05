import { describe, expect, it } from "vitest";
import {
  canStoreCollectionPlacement,
  EMPTY_TERM_LAYOUT,
  MAX_COLLECTION_LAYOUTS,
  moreCount,
  parsePlacement,
  parseTermLayout,
  resolvePlacement,
  toPlacement,
  withCollectionPlacement,
  withDefaultPlacement,
  withoutCollectionPlacement,
} from "./term-layout";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

describe("parseTermLayout", () => {
  it("falls back to an empty layout for anything that isn't one", () => {
    expect(parseTermLayout(null)).toEqual(EMPTY_TERM_LAYOUT);
    expect(parseTermLayout([])).toEqual(EMPTY_TERM_LAYOUT);
    expect(parseTermLayout("note")).toEqual(EMPTY_TERM_LAYOUT);
  });

  it("drops unknown blocks, values and collection ids", () => {
    const layout = parseTermLayout({
      default: { note: "more", example: "shown", bogus: "more" },
      collections: {
        [A]: { example: "more", note: 3 },
        "not-a-uuid": { note: "more" },
      },
    });
    expect(layout.default).toEqual({ note: "more" });
    expect(layout.collections).toEqual({ [A]: { example: "more" } });
  });
});

describe("resolvePlacement", () => {
  const layout = parseTermLayout({
    default: { note: "more" },
    collections: { [A]: { example: "more" } },
  });

  it("shows everything when nothing is set", () => {
    expect(Object.values(resolvePlacement(EMPTY_TERM_LAYOUT, A))).toEqual(Array(8).fill("shown"));
  });

  it("uses the collection's own map instead of the default", () => {
    const placement = resolvePlacement(layout, A);
    expect(placement.example).toBe("more");
    expect(placement.note).toBe("shown");
  });

  it("uses the default for a collection with no map", () => {
    expect(resolvePlacement(layout, B).note).toBe("more");
    expect(resolvePlacement(layout, undefined).note).toBe("more");
  });
});

describe("saving", () => {
  const moved = { ...toPlacement({}), note: "more" as const };

  it("changes only the default when saving for all collections", () => {
    const before = withCollectionPlacement(EMPTY_TERM_LAYOUT, A, moved);
    const after = withDefaultPlacement(before, toPlacement({ example: "more" }));
    expect(after.default).toEqual({ example: "more" });
    expect(after.collections).toEqual(before.collections);
  });

  it("stores only blocks moved under More", () => {
    expect(withCollectionPlacement(EMPTY_TERM_LAYOUT, A, moved).collections[A]).toEqual({
      note: "more",
    });
  });

  it("removes a collection's own map", () => {
    const before = withCollectionPlacement(EMPTY_TERM_LAYOUT, A, moved);
    expect(withoutCollectionPlacement(before, A).collections).toEqual({});
  });
});

describe("parsePlacement", () => {
  it("needs every block to be shown or more", () => {
    expect(parsePlacement(toPlacement({}))).not.toBeNull();
    expect(parsePlacement({ ...toPlacement({}), note: "hidden" })).toBeNull();
    expect(parsePlacement({ note: "more" })).toBeNull();
    expect(parsePlacement(null)).toBeNull();
  });
});

describe("moreCount", () => {
  const term = {
    example: "An example",
    mentalModel: undefined,
    discussion: "  ",
    antiExample: undefined,
    controversy: undefined,
    note: "A note",
    relationships: [],
  };

  it("counts only blocks under More that have content", () => {
    const placement = toPlacement({
      example: "more",
      mentalModel: "more",
      discussion: "more",
      relationships: "more",
      note: "more",
    });
    expect(moreCount(placement, term, true)).toBe(2);
  });

  it("counts the search link only when it is offered", () => {
    const placement = toPlacement({ searchLink: "more" });
    expect(moreCount(placement, term, true)).toBe(1);
    expect(moreCount(placement, term, false)).toBe(0);
  });
});

function uuid(n: number) {
  return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

describe("collection limit", () => {
  const full = parseTermLayout({
    collections: Object.fromEntries(
      Array.from({ length: MAX_COLLECTION_LAYOUTS }, (_, i) => [uuid(i), { note: "more" }]),
    ),
  });

  it("never drops stored collections when reading", () => {
    const over = parseTermLayout({
      collections: Object.fromEntries(
        Array.from({ length: MAX_COLLECTION_LAYOUTS + 20 }, (_, i) => [uuid(i), { note: "more" }]),
      ),
    });
    expect(Object.keys(over.collections)).toHaveLength(MAX_COLLECTION_LAYOUTS + 20);
  });

  it("refuses a new collection once the limit is reached", () => {
    expect(canStoreCollectionPlacement(full, uuid(MAX_COLLECTION_LAYOUTS))).toBe(false);
  });

  it("still lets a collection that has a map change it", () => {
    expect(canStoreCollectionPlacement(full, uuid(0))).toBe(true);
  });

  it("allows a new collection while there is room", () => {
    expect(canStoreCollectionPlacement(EMPTY_TERM_LAYOUT, A)).toBe(true);
  });
});
