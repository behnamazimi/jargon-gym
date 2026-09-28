import { describe, expect, it } from "vitest";
import { createCollectionPreference, resolveStudyCollectionId } from "./collection-preference";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

describe("createCollectionPreference().parse", () => {
  const pref = createCollectionPreference("jg-test");

  it("accepts all or a collection id", () => {
    expect(pref.parse("all")).toBe("all");
    expect(pref.parse(encodeURIComponent(A))).toBe(A);
  });

  it("ignores empty, malformed or foreign values", () => {
    expect(pref.parse(undefined)).toBeNull();
    expect(pref.parse("%E0%A4%A")).toBeNull();
    expect(pref.parse("drop table")).toBeNull();
  });
});

describe("resolveStudyCollectionId", () => {
  it("prefers a link to an active collection", () => {
    expect(resolveStudyCollectionId(B, A, [A, B])).toBe(B);
  });

  it("falls back to the remembered collection when the link isn't active", () => {
    expect(resolveStudyCollectionId("nope", A, [A])).toBe(A);
    expect(resolveStudyCollectionId(undefined, "all", [A])).toBe("all");
  });

  it("skips a remembered collection that's paused or gone", () => {
    expect(resolveStudyCollectionId(undefined, B, [A])).toBe("all");
  });

  it("defaults to all", () => {
    expect(resolveStudyCollectionId(undefined, null, [A])).toBe("all");
  });
});
