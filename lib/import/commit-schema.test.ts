import { describe, expect, it } from "vitest";
import { commitImportSchema } from "./commit-schema";

const base = {
  importId: "11111111-1111-4111-8111-111111111111",
  terms: [{ term: "API" }],
  policy: "skip",
  entry: "chooser",
  source: "paste",
  format: "lines",
};
describe("commitImportSchema text cleaning", () => {
  const parse = (terms: unknown, destination: unknown) =>
    commitImportSchema.safeParse({ ...base, terms, destination });
  const dest = { name: "Fine", language: "en" };

  it("removes control and override characters from terms and details", () => {
    const result = parse([{ term: "AP\u0000I", definition: "a\u202E way", note: "n\u0007" }], dest);
    expect(result.success && result.data.terms[0]).toMatchObject({
      term: "API",
      definition: "a way",
      note: "n",
    });
  });

  it("cleans the new collection's name", () => {
    const result = parse([{ term: "API" }], { name: "Fi\u0000ne\u202E", language: "en" });
    expect(
      result.success && "name" in result.data.destination && result.data.destination.name,
    ).toBe("Fine");
  });

  it("rejects a term that is only control characters", () => {
    expect(parse([{ term: "\u0000\u202E" }], dest).success).toBe(false);
  });

  it("still enforces the length caps after cleaning", () => {
    expect(parse([{ term: "a".repeat(201) }], dest).success).toBe(false);
    expect(parse([{ term: "a", definition: "b".repeat(4001) }], dest).success).toBe(false);
  });
});

describe("collection ids", () => {
  it("accepts ids whose version and variant bits are not RFC 4122", () => {
    const destination = { domainId: "22222222-2222-2222-2222-222222222222" };
    expect(commitImportSchema.safeParse({ ...base, destination }).success).toBe(true);
  });
});
