import { describe, expect, it } from "vitest";
import { readJsonImport } from "./json-input";

function term(overrides: Record<string, unknown> = {}) {
  return { term: "Churn", category: "Growth", definition: "Customers who leave.", ...overrides };
}

function messagesFor(payload: unknown): string[] {
  const result = readJsonImport(typeof payload === "string" ? payload : JSON.stringify(payload));
  if (result.ok) return [];
  return [result.failure.message, ...(result.failure.issues ?? []).map((issue) => issue.message)];
}

function issuesFor(payload: unknown): string[] {
  const result = readJsonImport(typeof payload === "string" ? payload : JSON.stringify(payload));
  if (result.ok) return [];
  return (result.failure.issues ?? []).map((issue) => issue.message);
}

describe("plain-language import issues", () => {
  it.each([
    ["empty term name", { collection: "X", terms: [term({ term: " " })] }, "Term 1 has no name."],
    [
      "missing term name",
      { collection: "X", terms: [{ category: "A", definition: "B" }] },
      "Term 1 has no name.",
    ],
    [
      "second term unnamed",
      { collection: "X", terms: [term(), term({ term: "" })] },
      "Term 2 has no name.",
    ],
    [
      "wrong type",
      { collection: "X", terms: [term({ definition: 5 })] },
      '"Churn": definition should be text.',
    ],
    [
      "wrong optional type",
      { collection: "X", terms: [term({ mental_model: 5 })] },
      '"Churn": mental model should be text.',
    ],
    [
      "no terms",
      { collection: "X", terms: [] },
      "There are no terms in this file. Add at least one.",
    ],
    ["terms missing", { collection: "X" }, 'Add a "terms" list with at least one term.'],
    [
      "no collection",
      { terms: [term()] },
      'Add a collection name, like "collection": "Startup finance".',
    ],
    [
      "blank collection",
      { collection: " ", terms: [term()] },
      'Add a collection name, like "collection": "Startup finance".',
    ],
    [
      "term not an object",
      { collection: "X", terms: ["Churn"] },
      "Term 1 should have a name and a definition.",
    ],
    [
      "root array",
      [],
      "This doesn't look like a collection. It should start with { and list your terms.",
    ],
  ])("%s", (_name, payload, expected) => {
    expect(issuesFor(payload)).toContain(expected);
  });

  it("names the missing part of a link", () => {
    const payload = { collection: "X", terms: [term()], relationships: [{ source: "Churn" }] };
    expect(issuesFor(payload)).toEqual(
      expect.arrayContaining(["Link 1 is missing its second term.", "Link 1 is missing its type."]),
    );
  });

  it("lists at most 10 problems and counts the rest", () => {
    const terms = Array.from({ length: 13 }, (_, i) => term({ term: `T${i}`, definition: 5 }));
    const issues = issuesFor({ collection: "X", terms });
    expect(issues).toHaveLength(11);
    expect(issues[10]).toBe("…and 3 more.");
  });

  it("never shows a path", () => {
    const payload = {
      collection: "X",
      terms: [term({ category: 7 }), term({ term: "" }), term({ definition: 1 })],
      relationships: [{ source: "Churn" }],
    };
    for (const message of messagesFor(payload)) {
      expect(message).not.toMatch(/terms\[|terms\.|relationships\[|relationships\./);
    }
  });
});

describe("JSON problems", () => {
  it("explains text that isn't JSON", () => {
    expect(messagesFor("Churn - customers who leave")[0]).toBe(
      "This doesn't look like JSON. It should start with { and list your terms.",
    );
  });

  it("points at the line and column of a syntax error", () => {
    const message = messagesFor('{\n  "collection": "X",\n  "terms": [ , ]\n}')[0];
    expect(message).toMatch(/^Couldn't read this as JSON\. Look near line \d+, column \d+/);
    expect(message).not.toMatch(/position/i);
  });

  it("handles a trailing comma", () => {
    const message = messagesFor('{"collection": "X", "terms": [],}')[0];
    expect(message).toContain("Couldn't read this as JSON.");
  });
});

describe("optional fields", () => {
  it.each([
    ["no category", { category: undefined }],
    ["null category", { category: null }],
    ["blank category", { category: "  " }],
    ["no definition", { definition: undefined }],
    ["blank definition", { definition: "" }],
  ])("accepts %s", (_name, overrides) => {
    const result = readJsonImport(JSON.stringify({ collection: "X", terms: [term(overrides)] }));
    expect(result.ok).toBe(true);
  });

  it("turns blanks into none", () => {
    const result = readJsonImport(
      JSON.stringify({ collection: "X", terms: [term({ category: " ", definition: "" })] }),
    );
    if (!result.ok) throw new Error("expected ok");
    expect(result.data.built.terms[0]).toMatchObject({ category: null, definition: null });
  });
});
