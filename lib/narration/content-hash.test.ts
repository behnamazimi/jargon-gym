import { describe, expect, it } from "vitest";
import { computeContentHash } from "./content-hash";

const BASE = {
  term: "Closure",
  definition: "A function bundled with its lexical scope.",
  example: "A counter factory returning an incrementer.",
  mental_model: null,
  discussion: null,
  anti_example: null,
  controversy: null,
};

describe("computeContentHash", () => {
  it("is stable for the same fields", () => {
    expect(computeContentHash(BASE)).toBe(computeContentHash({ ...BASE }));
  });

  it("changes when a narrated field changes", () => {
    const hash = computeContentHash(BASE);
    const changed = computeContentHash({ ...BASE, definition: "Something different." });
    expect(changed).not.toBe(hash);
  });

  it("does not collide across field boundaries", () => {
    const a = computeContentHash({ ...BASE, term: "ab", definition: "c" });
    const b = computeContentHash({ ...BASE, term: "a", definition: "bc" });
    expect(a).not.toBe(b);
  });

  it("treats null and empty string the same for optional fields", () => {
    const withNull = computeContentHash({ ...BASE, example: null });
    const withEmpty = computeContentHash({ ...BASE, example: "" });
    expect(withNull).toBe(withEmpty);
  });
});
