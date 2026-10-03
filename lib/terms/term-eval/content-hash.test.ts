import { describe, expect, it } from "vitest";
import { computeTermEvalHash } from "./content-hash";
import type { EvalTerm } from "./rubric";

const term: EvalTerm = {
  domainName: "Software Engineering",
  term: "Cache",
  category: "Performance",
  definition: "A stored copy of a result.",
  example: null,
  mentalModel: null,
  discussion: null,
  antiExample: null,
  controversy: null,
};

describe("computeTermEvalHash", () => {
  it("is stable for the same entry, ignoring surrounding whitespace", () => {
    expect(computeTermEvalHash({ ...term, term: "  Cache " })).toBe(computeTermEvalHash(term));
  });

  it("changes when a field changes", () => {
    expect(computeTermEvalHash({ ...term, definition: "Other." })).not.toBe(
      computeTermEvalHash(term),
    );
  });
});
