import { describe, expect, it } from "vitest";
import { buildPublishSlugs } from "./publish-slugs";

describe("buildPublishSlugs", () => {
  it("names the collection and every term that has no slug", () => {
    const result = buildPublishSlugs({
      collectionName: "Cooking",
      collectionSlug: null,
      takenCollectionSlugs: new Set(["cooking"]),
      terms: [
        { id: "t1", term: "Sauté", slug: null },
        { id: "t2", term: "Saute", slug: null },
      ],
    });
    expect(result).toEqual({
      collectionSlug: "cooking-2",
      termSlugs: { t1: "saute", t2: "saute-2" },
    });
  });

  it("keeps the collection's slug and leaves slugged terms alone, but reserves their slugs", () => {
    const result = buildPublishSlugs({
      collectionName: "Cooking",
      collectionSlug: "cooking",
      takenCollectionSlugs: new Set(["cooking"]),
      terms: [
        { id: "t1", term: "Roux", slug: "roux" },
        { id: "t2", term: "Roux!", slug: null },
      ],
    });
    expect(result).toEqual({ collectionSlug: "cooking", termSlugs: { t2: "roux-2" } });
  });

  it("sends nothing when every term already has a slug", () => {
    const result = buildPublishSlugs({
      collectionName: "A",
      collectionSlug: "a",
      takenCollectionSlugs: new Set(),
      terms: [{ id: "t1", term: "x", slug: "x" }],
    });
    expect(result.termSlugs).toEqual({});
  });
});
