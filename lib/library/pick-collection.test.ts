import { describe, expect, it } from "vitest";
import { pickLibraryCollectionId } from "./pick-collection";

const collections = [
  { id: "paused", isActiveForReview: false },
  { id: "active", isActiveForReview: true },
  { id: "other", isActiveForReview: true },
];

describe("pickLibraryCollectionId", () => {
  it("prefers the requested collection, then the last viewed one", () => {
    expect(
      pickLibraryCollectionId(collections, {
        requestedCollectionId: "other",
        lastCollectionId: "paused",
      }),
    ).toBe("other");
    expect(pickLibraryCollectionId(collections, { lastCollectionId: "paused" })).toBe("paused");
  });

  it("ignores ids the user doesn't have and falls back to the first active", () => {
    expect(
      pickLibraryCollectionId(collections, {
        requestedCollectionId: "gone",
        lastCollectionId: "gone",
      }),
    ).toBe("active");
  });

  it("uses the first collection when none is active, and nothing when there are none", () => {
    expect(pickLibraryCollectionId([{ id: "a", isActiveForReview: false }], {})).toBe("a");
    expect(pickLibraryCollectionId([], {})).toBeUndefined();
  });
});
