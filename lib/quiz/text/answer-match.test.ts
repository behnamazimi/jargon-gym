import { describe, expect, it } from "vitest";
import { closeMiss, matchesAnswer, normalizeAnswer } from "./answer-match";

describe("matchesAnswer", () => {
  it("ignores case and surrounding or repeated spaces", () => {
    expect(matchesAnswer("  Het   LICHT ", ["het licht"])).toBe(true);
  });

  it("treats composed and decomposed accents as the same", () => {
    expect(matchesAnswer("café", ["café"])).toBe(true);
  });

  it("counts accents and articles", () => {
    expect(matchesAnswer("cafe", ["café"])).toBe(false);
    expect(matchesAnswer("licht", ["het licht"])).toBe(false);
  });

  it("accepts any listed answer and never an empty one", () => {
    expect(matchesAnswer("wandelen", ["lopen", "wandelen"])).toBe(true);
    expect(matchesAnswer("   ", [""])).toBe(false);
  });
});

describe("normalizeAnswer", () => {
  it("is idempotent", () => {
    const once = normalizeAnswer("  Ik  ZIE ");
    expect(normalizeAnswer(once)).toBe(once);
  });
});

describe("closeMiss", () => {
  it("spots a miss that is only accents", () => {
    expect(closeMiss("cafe", ["café"])).toBe("accents");
  });

  it("spots a dropped or added article", () => {
    expect(closeMiss("licht", ["het licht"])).toBe("article");
    expect(closeMiss("het licht", ["licht"])).toBe("article");
  });

  it("is null for an unrelated answer or an empty one", () => {
    expect(closeMiss("donker", ["het licht"])).toBeNull();
    expect(closeMiss("", ["licht"])).toBeNull();
  });
});
