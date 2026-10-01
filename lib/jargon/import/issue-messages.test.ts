import { describe, expect, it } from "vitest";
import { parseImportJson } from "./validate-import";

function term(overrides: Record<string, unknown> = {}) {
  return { term: "Churn", category: "Growth", definition: "Customers who leave.", ...overrides };
}

function messagesFor(payload: unknown): string[] {
  const result = parseImportJson(typeof payload === "string" ? payload : JSON.stringify(payload));
  if (result.ok) return [];
  return [result.failure.message, ...(result.failure.issues ?? []).map((issue) => issue.message)];
}

function issuesFor(payload: unknown): string[] {
  const result = parseImportJson(typeof payload === "string" ? payload : JSON.stringify(payload));
  if (result.ok) return [];
  return (result.failure.issues ?? []).map((issue) => issue.message);
}

describe("plain-language import issues", () => {
  it.each([
    [
      "missing category",
      { domain: "X", terms: [term({ category: undefined })] },
      '"Churn" needs a category.',
    ],
    [
      "null category",
      { domain: "X", terms: [term({ category: null })] },
      '"Churn" needs a category.',
    ],
    [
      "empty category",
      { domain: "X", terms: [term({ category: "  " })] },
      '"Churn" needs a category.',
    ],
    [
      "missing definition",
      { domain: "X", terms: [term({ definition: undefined })] },
      '"Churn" needs a definition.',
    ],
    ["empty term name", { domain: "X", terms: [term({ term: " " })] }, "Term 1 has no name."],
    [
      "missing term name",
      { domain: "X", terms: [{ category: "A", definition: "B" }] },
      "Term 1 has no name.",
    ],
    [
      "second term unnamed",
      { domain: "X", terms: [term(), term({ term: "" })] },
      "Term 2 has no name.",
    ],
    [
      "wrong type",
      { domain: "X", terms: [term({ definition: 5 })] },
      '"Churn": definition should be text.',
    ],
    [
      "wrong optional type",
      { domain: "X", terms: [term({ mental_model: 5 })] },
      '"Churn": mental model should be text.',
    ],
    ["no terms", { domain: "X", terms: [] }, "There are no terms in this file. Add at least one."],
    ["terms missing", { domain: "X" }, 'Add a "terms" list with at least one term.'],
    ["no domain", { terms: [term()] }, 'Add a collection name, like "domain": "Startup finance".'],
    [
      "blank domain",
      { domain: " ", terms: [term()] },
      'Add a collection name, like "domain": "Startup finance".',
    ],
    [
      "term not an object",
      { domain: "X", terms: ["Churn"] },
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

  it("flags the same term twice", () => {
    expect(issuesFor({ domain: "X", terms: [term(), term({ term: " churn " })] })).toEqual([
      '"churn" appears twice. Keep one of them.',
    ]);
  });

  it("flags links to terms that aren't in the list", () => {
    const payload = {
      domain: "X",
      terms: [term()],
      relationships: [{ source: "Churn", target: "Retention", relationship_type: "opposite of" }],
    };
    expect(issuesFor(payload)).toEqual([
      'The link from "Churn" to "Retention" points to a term that isn\'t in your list: "Retention".',
    ]);
  });

  it("flags duplicate and self links", () => {
    const link = { source: "Churn", target: "Retention", relationship_type: "opposite of" };
    const payload = {
      domain: "X",
      terms: [term(), term({ term: "Retention" })],
      relationships: [link, link, { source: "Churn", target: "Churn", relationship_type: "is" }],
    };
    expect(issuesFor(payload)).toEqual([
      'The link from "Churn" to "Retention" (opposite of) is listed twice.',
      '"Churn" can\'t be linked to itself.',
    ]);
  });

  it("names the missing part of a link", () => {
    const payload = { domain: "X", terms: [term()], relationships: [{ source: "Churn" }] };
    expect(issuesFor(payload)).toEqual(
      expect.arrayContaining(["Link 1 is missing its second term.", "Link 1 is missing its type."]),
    );
  });

  it("lists at most 10 problems and counts the rest", () => {
    const terms = Array.from({ length: 13 }, (_, i) => term({ term: `T${i}`, category: "" }));
    const issues = issuesFor({ domain: "X", terms });
    expect(issues).toHaveLength(11);
    expect(issues[10]).toBe("…and 3 more.");
  });

  it("never shows a path", () => {
    const payload = {
      domain: "X",
      terms: [term({ category: "" }), term({ term: "" }), term({ definition: 1 })],
      relationships: [{ source: "Churn" }],
    };
    for (const message of messagesFor(payload)) {
      expect(message).not.toMatch(/terms\[|terms\.|relationships\[|relationships\./);
    }
  });
});

describe("JSON problems", () => {
  it("handles empty input", () => {
    expect(messagesFor("   ")[0]).toBe("Nothing to check yet. Paste JSON or choose a .json file.");
  });

  it("explains text that isn't JSON", () => {
    expect(messagesFor("Churn - customers who leave")[0]).toBe(
      "This doesn't look like JSON. It should start with { and list your terms.",
    );
  });

  it("points at the line and column of a syntax error", () => {
    const message = messagesFor('{\n  "domain": "X",\n  "terms": [ , ]\n}')[0];
    expect(message).toMatch(/^We couldn't read this as JSON\. Look near line \d+, column \d+/);
    expect(message).not.toMatch(/position/i);
  });

  it("handles a trailing comma", () => {
    const message = messagesFor('{"domain": "X", "terms": [],}')[0];
    expect(message).toContain("We couldn't read this as JSON.");
  });
});
