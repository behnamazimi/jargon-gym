import { describe, expect, it } from "vitest";
import { computeContentHash } from "@/lib/narration/content-hash";
import { computeContentHashV2, computeTermOnlyHash } from "@/lib/narration/content-hash-v2";

// These values were computed before category and definition became nullable.
// If one changes, every cached narration is thrown away.
const narrated = {
  term: "SLA",
  definition: "A promised level of service",
  example: "Ex",
  mental_model: null,
  discussion: null,
  anti_example: null,
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

  it("narration term only", () => {
    expect(computeTermOnlyHash("SLA", "nl")).toBe(
      "0cf7ffc7b405437f4f2d985e3118209946ca50160a4c53f966b4892e49b5c60a",
    );
  });
});
