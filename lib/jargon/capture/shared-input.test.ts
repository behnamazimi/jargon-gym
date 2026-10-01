import { describe, expect, it } from "vitest";
import { MAX_SENTENCE_CHARS, parseSharedInput } from "./shared-input";

const parse = (text: string | string[] | undefined) => parseSharedInput({ text });

describe("parseSharedInput", () => {
  it.each([
    ["undefined", undefined],
    ["empty", ""],
    ["whitespace", "  \n "],
    ["a link only", "https://example.com/post?id=1"],
    ["punctuation only", "…"],
  ])("%s gives nothing", (_name, text) => {
    expect(parse(text)).toEqual({ kind: "none" });
  });

  it("strips a link that came in with the text", () => {
    expect(parse("idempotent https://example.com/x")).toEqual({ kind: "term", term: "idempotent" });
  });

  it("treats a short phrase as the term", () => {
    expect(parse("burn rate")).toEqual({ kind: "term", term: "burn rate" });
    expect(parse("a b c")).toEqual({ kind: "term", term: "a b c" });
  });

  it("treats a sentence as a sentence", () => {
    expect(parse("We need to renegotiate the SLA before the Q3 renewal.")).toEqual({
      kind: "sentence",
      sentence: "We need to renegotiate the SLA before the Q3 renewal.",
    });
    expect(parse("Is it done?")).toEqual({ kind: "sentence", sentence: "Is it done?" });
  });

  it("does not use the title", () => {
    expect(parseSharedInput({ text: undefined })).toEqual({ kind: "none" });
  });

  it("caps a long sentence at a word boundary", () => {
    const long = "word ".repeat(200).trim();
    const result = parse(long);
    expect(result.kind).toBe("sentence");
    if (result.kind === "sentence") {
      expect(result.sentence.length).toBeLessThanOrEqual(MAX_SENTENCE_CHARS);
      expect(result.sentence.endsWith("word")).toBe(true);
    }
  });

  it("reads two lines as a term and its definition", () => {
    expect(parse("SLA\nA promise about the level of service")).toEqual({
      kind: "pair",
      term: "SLA",
      definition: "A promise about the level of service",
    });
  });

  it("reads several lines as a list", () => {
    expect(parse("SLA\nChurn\nRunway")).toEqual({
      kind: "lines",
      lines: ["SLA", "Churn", "Runway"],
    });
  });

  it("uses the first value when the param is repeated", () => {
    expect(parse(["idempotent", "other"])).toEqual({ kind: "term", term: "idempotent" });
    expect(parse([])).toEqual({ kind: "none" });
  });

  it.each([
    ["“synergy”", "synergy"],
    ["synergy,", "synergy"],
    ['"burn rate"', "burn rate"],
    ["401(k)", "401(k)"],
  ])("trims quotes and commas around a short term: %s", (text, expected) => {
    expect(parse(text)).toEqual({ kind: "term", term: expected });
  });

  it("treats one word ending in a full stop as a sentence", () => {
    expect(parse("Synergy.")).toEqual({ kind: "sentence", sentence: "Synergy." });
  });

  it("reads only the start of a huge share", () => {
    const result = parse("word ".repeat(5000));
    expect(result.kind).toBe("sentence");
  });
});
