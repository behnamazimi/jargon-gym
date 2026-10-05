import { describe, expect, it } from "vitest";
import { computeContentHash } from "@/lib/narration/content-hash";
import { computeContentHashV2, computeTermOnlyHash } from "@/lib/narration/content-hash-v2";
import { loadStorySubject, loadTermSubject } from "./subjects";

const FIELDS = {
  term: "Closure",
  definition: "A function bundled with its lexical scope.",
  example: null,
  mental_model: null,
  discussion: null,
  anti_example: null,
  controversy: null,
};

function clientReturning(data: unknown, mode?: "term" | "full") {
  const settings = mode ? [{ domain_id: "d1", mode }] : [];
  return {
    from: () => ({
      select: () => ({
        in: async () => ({ data: settings, error: null }),
        eq: () => ({
          eq: () => ({ maybeSingle: async () => ({ data, error: null }) }),
          maybeSingle: async () => ({ data, error: null }),
        }),
      }),
    }),
  } as never;
}

const TERM_ROW = { ...FIELDS, domain_id: "d1", domains: { language: "nl" } };

describe("loadTermSubject", () => {
  it("uses the term name alone by default, with no version 1 hash", async () => {
    const subject = await loadTermSubject(clientReturning(TERM_ROW), "t1");
    expect(subject).toMatchObject({ type: "term", id: "t1", userId: null });
    expect(subject?.contentHash).toBe(computeTermOnlyHash("Closure", "nl"));
    expect(subject?.legacyHash).toBeUndefined();
    expect(await subject?.loadScript()).toEqual({ script: "Closure.", language: "nl" });
  });

  it("in full mode hashes with the collection language (version 2) and keeps the old hash for version 1 clips", async () => {
    const subject = await loadTermSubject(clientReturning(TERM_ROW, "full"), "t1");
    expect(subject?.contentHash).toBe(computeContentHashV2(FIELDS, "nl"));
    expect(subject?.contentHash).not.toBe(computeContentHashV2(FIELDS, "en"));
    expect(subject?.legacyHash).toBe(computeContentHash(FIELDS));
    expect((await subject?.loadScript())?.language).toBe("nl");
  });

  it("is null for a term that does not exist", async () => {
    expect(await loadTermSubject(clientReturning(null), "t1")).toBeNull();
  });
});

describe("loadStorySubject", () => {
  it("is null unless the story belongs to the person", async () => {
    expect(await loadStorySubject(clientReturning(null), "u1", "s1")).toBeNull();
  });

  it("uses constants for the hashes and carries the owner", async () => {
    const subject = await loadStorySubject(clientReturning({ id: "s1" }), "u1", "s1");
    expect(subject).toMatchObject({
      type: "story",
      id: "s1",
      userId: "u1",
      contentHash: "story-v2",
      legacyHash: "story-v1",
    });
  });
});
