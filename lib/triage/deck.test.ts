import { describe, expect, it } from "vitest";
import type { Term } from "@/lib/jargon/types";
import { buildTriageDeck, parseNotYetIds, toTriageTerm } from "./deck";

function makeTerm(id: string): Term {
  return {
    id,
    term: id.toUpperCase(),
    category: "General",
    definition: "",
    example: "",
    discussion: "",
    relationships: [],
  };
}

const none = new Set<string>();

describe("buildTriageDeck", () => {
  const terms = ["a", "b", "c", "d", "e"].map(makeTerm);

  it("keeps every term, in Library order, when nothing is excluded", () => {
    const deck = buildTriageDeck(terms, { knownIds: none, markedKnownIds: none, notYetIds: none });
    expect(deck.map((t) => t.id)).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("drops earned-known, marked-known, and not-yet terms", () => {
    const deck = buildTriageDeck(terms, {
      knownIds: new Set(["b"]),
      markedKnownIds: new Set(["d"]),
      notYetIds: new Set(["a"]),
    });
    expect(deck.map((t) => t.id)).toEqual(["c", "e"]);
  });
});

describe("toTriageTerm", () => {
  it("adds the collection name and language without flagging the term as new", () => {
    const term = toTriageTerm(makeTerm("a"), { name: "Finance", language: "en" });
    expect(term.domainName).toBe("Finance");
    expect(term.domainLanguage).toBe("en");
    expect(term.isNewToUser).toBeUndefined();
  });
});

describe("parseNotYetIds", () => {
  it("reads a stored list of ids", () => {
    expect(parseNotYetIds(JSON.stringify(["a", "b"]))).toEqual(["a", "b"]);
  });

  it("treats empty, corrupt, or non-array values as empty", () => {
    expect(parseNotYetIds(null)).toEqual([]);
    expect(parseNotYetIds("")).toEqual([]);
    expect(parseNotYetIds("{not json")).toEqual([]);
    expect(parseNotYetIds(JSON.stringify({ a: 1 }))).toEqual([]);
  });

  it("drops non-string entries", () => {
    expect(parseNotYetIds(JSON.stringify(["a", 3, null, "b"]))).toEqual(["a", "b"]);
  });
});
