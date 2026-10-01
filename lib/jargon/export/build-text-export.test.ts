import { describe, expect, it } from "vitest";
import { parseList } from "@/lib/jargon/import/parse/detect";
import { buildTerms } from "@/lib/jargon/import/parse/build-terms";
import { collectionToCsv, collectionToText } from "./build-text-export";

const terms = [
  { term: "API", definition: "a way to talk", category: "Tech" },
  { term: "Cache, L2", definition: 'a "stored" copy\nof data', category: null },
  { term: "MRR", definition: null, category: null },
];

describe("text export", () => {
  it("writes one line per term and leaves out a missing definition", () => {
    expect(collectionToText(terms)).toBe(
      'API – a way to talk\nCache, L2 – a "stored" copy of data\nMRR',
    );
  });

  it("round-trips through the importer", () => {
    const simple = [terms[0], terms[2], { term: "SLA", definition: "promise", category: null }];
    const built = buildTerms(parseList(collectionToText(simple)));
    expect(built.terms.map((t) => [t.term, t.definition])).toEqual([
      ["API", "a way to talk"],
      ["MRR", null],
      ["SLA", "promise"],
    ]);
  });
});

describe("csv export", () => {
  it("quotes cells with commas, quotes and line breaks", () => {
    expect(collectionToCsv(terms)).toBe(
      'Term,Definition,Category\nAPI,a way to talk,Tech\n"Cache, L2","a ""stored"" copy\nof data",\nMRR,,',
    );
  });

  it.each(["=1+1", "+cmd", "-2+3", "@SUM(A1)", "\tx", '=HYPERLINK("http://x")'])(
    "stops %j from running as a formula",
    (cell) => {
      const csv = collectionToCsv([{ term: "T", definition: cell, category: null }]);
      expect(csv.split("\n")[1]).not.toMatch(/^T,"?[=+\-@\t]/);
      expect(csv).toContain("'" + cell.replaceAll('"', '""'));
    },
  );

  it("leaves ordinary cells alone", () => {
    expect(collectionToCsv([{ term: "e-mail", definition: "it's fine", category: null }])).toBe(
      "Term,Definition,Category\ne-mail,it's fine,",
    );
  });

  it("round-trips a formula-looking term through the importer", () => {
    const csv = collectionToCsv([
      { term: "=SLA", definition: "a promise", category: "Tech" },
      { term: "API", definition: "a way to talk", category: "Tech" },
      { term: "Cache", definition: "a copy", category: "Tech" },
    ]);
    const built = buildTerms(parseList(csv));
    expect(built.terms.map((t) => t.term)).toEqual(["=SLA", "API", "Cache"]);
  });
});
