import { describe, expect, it } from "vitest";
import { schemaFitFromAnswers } from "./evaluate";
import type { EvalTerm } from "./rubric";

const term: EvalTerm = {
  domainName: "Software Engineering",
  term: "Cache",
  category: "Performance",
  definition: "A stored copy of a result.",
  example: "The homepage sits in a CDN cache.",
  mentalModel: null,
  discussion: null,
  antiExample: null,
  controversy: null,
};

function score(value: number) {
  return { type: "score", score: value };
}

describe("schemaFitFromAnswers", () => {
  it("weights definition double and leaves empty fields out", () => {
    const fit = schemaFitFromAnswers(term, {
      term_fit: score(2),
      category_fit: score(2),
      definition_fit: score(1),
      example_fit: score(2),
    });
    const weighted = 0.5 * 1 + 0.5 * 1 + 2 * 0.5 + 1 * 1;
    const weight = 0.5 + 0.5 + 2 + 1;
    expect(fit).toBeCloseTo(weighted / weight);
  });
});
