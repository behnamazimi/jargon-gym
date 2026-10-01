import { describe, expect, it } from "vitest";
import { formatImportFailure } from "./errors";

describe("formatImportFailure", () => {
  it.each([
    ["23505", "A term or collection with that name already exists."],
    ["23503", "A linked term is missing."],
    ["42501", "You don't have permission to change this collection."],
    ["XX000", undefined],
  ])("maps %s to a plain reason", (code, reason) => {
    const failure = formatImportFailure(
      { code, message: 'duplicate key value violates unique constraint "terms_domain_term_idx"' },
      { step: "Could not create term", term: "Churn" },
    );
    expect(failure.message).toBe(
      'The import stopped at "Churn". Some terms before it may already be added.',
    );
    expect(failure.details).toEqual(reason ? [reason] : undefined);
    expect(failure.hint).toContain("updated, not duplicated");
    expect(JSON.stringify(failure)).not.toMatch(/violates|constraint|terms_domain/);
    expect(failure.code).toBeUndefined();
  });

  it("falls back when no term is known", () => {
    const failure = formatImportFailure(new Error("boom"));
    expect(failure.message).toBe("The import stopped part way. Some terms may already be added.");
    expect(JSON.stringify(failure)).not.toContain("boom");
  });

  it("handles unknown values", () => {
    expect(formatImportFailure("nope").message).toContain("stopped part way");
  });
});
