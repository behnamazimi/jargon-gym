import { describe, expect, it } from "vitest";
import {
  assignExampleJudgmentQuestions,
  buildExampleJudgmentQuestionLine,
} from "./example-judgment";

describe("assignExampleJudgmentQuestions", () => {
  it("only assigns terms that have an example or anti_example", () => {
    const terms = [
      { id: "a", example: "Alpha in action.", antiExample: null },
      { id: "b", example: null, antiExample: "Looks like Beta but isn't." },
      { id: "c", example: null, antiExample: null },
      { id: "d", example: null, antiExample: null },
    ];

    const assignments = assignExampleJudgmentQuestions(terms);

    for (const id of assignments.keys()) {
      expect(["a", "b"]).toContain(id);
    }
  });

  it("sets correctAnswer true from example, false from anti_example", () => {
    // 4 terms total so the ~50% cap has room for both eligible ones.
    const terms = [
      { id: "only-example", example: "A real example.", antiExample: null },
      { id: "only-anti", example: null, antiExample: "A tempting but wrong example." },
      { id: "plain-1", example: null, antiExample: null },
      { id: "plain-2", example: null, antiExample: null },
    ];

    const assignments = assignExampleJudgmentQuestions(terms);

    expect(assignments.get("only-example")).toEqual({
      text: "A real example.",
      correctAnswer: true,
    });
    expect(assignments.get("only-anti")).toEqual({
      text: "A tempting but wrong example.",
      correctAnswer: false,
    });
  });

  it("caps assignment at roughly half of the input", () => {
    const terms = Array.from({ length: 10 }, (_, i) => ({
      id: `t${i}`,
      example: `Example ${i}`,
      antiExample: null,
    }));

    const assignments = assignExampleJudgmentQuestions(terms);
    expect(assignments.size).toBeLessThanOrEqual(5);
  });
});

describe("buildExampleJudgmentQuestionLine", () => {
  it("wraps the term name in a question", () => {
    expect(buildExampleJudgmentQuestionLine("Sharding")).toBe('Does this illustrate "Sharding"?');
  });
});
