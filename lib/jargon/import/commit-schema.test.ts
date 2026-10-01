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

describe("commitImportSchema destination ids", () => {
  it.each([
    ["a random v4 id", "11111111-1111-4111-8111-111111111111"],
    ["a seeded id", "22222222-2222-2222-2222-222222222221"],
  ])("accepts %s", (_name, domainId) => {
    expect(commitImportSchema.safeParse({ ...base, destination: { domainId } }).success).toBe(true);
  });

  it("rejects something that isn't an id", () => {
    expect(
      commitImportSchema.safeParse({ ...base, destination: { domainId: "nope" } }).success,
    ).toBe(false);
  });
});
