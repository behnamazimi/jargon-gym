import { describe, expect, it } from "vitest";
import { guessLanguage } from "./parse/dutch-hint";
import { readJsonImport } from "./json-input";

describe("readJsonImport", () => {
  it("reads terms, links and language, with optional fields left out", () => {
    const result = readJsonImport(
      JSON.stringify({
        collection: "Startup finance",
        language: "nl",
        terms: [
          { term: "Churn", definition: "Customers who leave", category: "Growth" },
          { term: "Runway" },
        ],
        relationships: [{ source: "Churn", target: "Runway", relationship_type: "related" }],
      }),
    );
    if (!result.ok) throw new Error("expected ok");
    expect(result.data.collection).toBe("Startup finance");
    expect(result.data.language).toBe("nl");
    expect(result.data.built.terms).toMatchObject([
      { term: "Churn", definition: "Customers who leave", category: "Growth" },
      { term: "Runway", definition: null, category: null },
    ]);
    expect(result.data.links).toHaveLength(1);
  });

  it("folds repeated terms instead of blocking", () => {
    const result = readJsonImport(
      JSON.stringify({
        collection: "X",
        terms: [
          { term: "A", definition: "a" },
          { term: "a", definition: "A" },
        ],
      }),
    );
    if (!result.ok) throw new Error("expected ok");
    expect(result.data.built.terms).toHaveLength(1);
    expect(result.data.built.collapsed).toBe(1);
  });

  it("tells a syntax problem from a structure problem", () => {
    const syntax = readJsonImport('{"collection": "X", "terms": [');
    expect(syntax.ok === false && syntax.reason).toBe("syntax");
    const invalid = readJsonImport(JSON.stringify({ collection: "X", terms: [] }));
    expect(invalid.ok === false && invalid.reason).toBe("invalid");
  });
});

describe("guessLanguage", () => {
  it.each([
    ["too little text", ["de vergadering"], null],
    [
      "Dutch",
      [
        "de vergadering van het team is niet voor iedereen",
        "een overleg met de klant over het project",
      ],
      "nl",
    ],
    [
      "English",
      [
        "the meeting of the team is not for everyone",
        "a call with the client about the project and it",
      ],
      "en",
    ],
  ])("%s", (_name, texts, expected) => {
    expect(guessLanguage(texts)).toBe(expected);
  });
});
