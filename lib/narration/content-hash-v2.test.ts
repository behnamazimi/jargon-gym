import { describe, expect, it } from "vitest";
import { computeContentHash } from "./content-hash";
import { computeContentHashV2 } from "./content-hash-v2";
import type { NarratedTermFields } from "./types";

const FIELDS: NarratedTermFields = {
  term: "Closure",
  definition: "A function bundled with its scope.",
  example: null,
  mental_model: null,
  discussion: null,
  anti_example: null,
  controversy: null,
};

describe("narration content hash", () => {
  it("keeps version 1 exactly as it is today, so existing clips stay valid", () => {
    expect(computeContentHash(FIELDS)).toBe(
      "1d9b30c3525fd7685cd526973ff84ed6a3cfcd78b2dfb23885a41a03ff5d37e8",
    );
  });

  it("version 2 differs from version 1 for the same fields", () => {
    expect(computeContentHashV2(FIELDS, "en")).not.toBe(computeContentHash(FIELDS));
  });

  it("version 2 changes with the language and with the fields", () => {
    expect(computeContentHashV2(FIELDS, "en")).not.toBe(computeContentHashV2(FIELDS, "nl"));
    expect(computeContentHashV2(FIELDS, "en")).not.toBe(
      computeContentHashV2({ ...FIELDS, definition: "Other." }, "en"),
    );
  });

  it("version 2 is stable for the same input", () => {
    expect(computeContentHashV2(FIELDS, "en")).toBe(computeContentHashV2({ ...FIELDS }, "en"));
  });
});
