import { describe, expect, it } from "vitest";
import type { Term } from "@/lib/jargon/types";
import { buildTriageDeck, toTriageTerm } from "./deck";

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
