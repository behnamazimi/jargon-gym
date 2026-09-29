import { describe, expect, it } from "vitest";
import { computeContentHash } from "@/lib/narration/content-hash";
import { computeContentHashV2 } from "@/lib/narration/content-hash-v2";
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

function clientReturning(data: unknown) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({ maybeSingle: async () => ({ data, error: null }) }),
          maybeSingle: async () => ({ data, error: null }),
        }),
      }),
    }),
  } as never;
}

describe("loadTermSubject", () => {
  it("hashes with the collection language (version 2) and keeps the old hash for version 1 clips", async () => {
    const subject = await loadTermSubject(
      clientReturning({ ...FIELDS, domains: { language: "nl" } }),
      "t1",
    );
    expect(subject).toMatchObject({ type: "term", id: "t1", userId: null });
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
