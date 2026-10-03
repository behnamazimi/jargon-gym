import { describe, expect, it } from "vitest";
import { computeTermEvalHash } from "@/lib/terms/term-eval/content-hash";
import { computeContentHash } from "@/lib/narration/content-hash";
import { computeContentHashV2 } from "@/lib/narration/content-hash-v2";

// These values were computed before category and definition became nullable.
// If one changes, every cached narration or evaluation is thrown away.
const narrated = {
  term: "SLA",
  definition: "A promised level of service",
  example: "Ex",
  mental_model: null,
  discussion: null,
  anti_example: null,
  controversy: null,
};

const evalTerm = {
  domainName: "Legal",
  term: "SLA",
  category: "Contracts",
  definition: "A promised level of service",
  example: "Ex",
  mentalModel: null,
  discussion: null,
  antiExample: null,
  controversy: null,
};

describe("content hashes stay put for existing terms", () => {
  it("narration v1", () => {
    expect(computeContentHash(narrated)).toBe(
      "715573b8859de52a8adf8f0f6a15dac8c74974bdd2525c1eb5f6d5ec16f96a92",
    );
  });

  it("narration v2", () => {
    expect(computeContentHashV2(narrated, "nl")).toBe(
      "9cf81b113d3766719c95b3952870b1d6385c73c5321dcd2417c574208bc8e06b",
    );
  });

  it("evaluation", () => {
    expect(computeTermEvalHash(evalTerm)).toBe(
      "4398016ba1cfded193c516ae3eff78945c899b9873055743e83d25882bb3fb4d",
    );
  });

  it("evaluation treats a missing category like an empty one", () => {
    expect(computeTermEvalHash({ ...evalTerm, category: null })).toBe(
      computeTermEvalHash({ ...evalTerm, category: "" }),
    );
  });
});
