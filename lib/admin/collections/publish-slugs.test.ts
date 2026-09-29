import { describe, expect, it } from "vitest";
import { buildPublishSlugs } from "./publish-slugs";

describe("buildPublishSlugs", () => {
  it("names the domain and every term that has no slug", () => {
    const result = buildPublishSlugs({
      domainName: "Cooking",
      domainSlug: null,
      takenDomainSlugs: new Set(["cooking"]),
      terms: [
        { id: "t1", term: "Sauté", slug: null },
        { id: "t2", term: "Saute", slug: null },
      ],
    });
    expect(result).toEqual({
      domainSlug: "cooking-2",
      termSlugs: { t1: "saute", t2: "saute-2" },
    });
  });

  it("keeps the domain's slug and leaves slugged terms alone, but reserves their slugs", () => {
    const result = buildPublishSlugs({
      domainName: "Cooking",
      domainSlug: "cooking",
      takenDomainSlugs: new Set(["cooking"]),
      terms: [
        { id: "t1", term: "Roux", slug: "roux" },
        { id: "t2", term: "Roux!", slug: null },
      ],
    });
    expect(result).toEqual({ domainSlug: "cooking", termSlugs: { t2: "roux-2" } });
  });

  it("sends nothing when every term already has a slug", () => {
    const result = buildPublishSlugs({
      domainName: "A",
      domainSlug: "a",
      takenDomainSlugs: new Set(),
      terms: [{ id: "t1", term: "x", slug: "x" }],
    });
    expect(result.termSlugs).toEqual({});
  });
});
