import { describe, expect, it } from "vitest";
import { classifyTermPaste } from "./term-paste";

describe("classifyTermPaste", () => {
  it.each([
    ["one line", "Idempotent", { kind: "single" }],
    ["blank lines around one", "\n  SLA \n\n", { kind: "single" }],
    [
      "term and prose",
      "SLA\nA promise about how good a service will be",
      {
        kind: "term-and-definition",
        term: "SLA",
        definition: "A promise about how good a service will be",
      },
    ],
    ["two short lines are a list", "SLA\nChurn", { kind: "list", lines: ["SLA", "Churn"] }],
    [
      "three lines are a list",
      "SLA – promise\nChurn – leaving\nRunway – cash",
      { kind: "list", lines: ["SLA – promise", "Churn – leaving", "Runway – cash"] },
    ],
  ])("%s", (_name, text, expected) => {
    expect(classifyTermPaste(text)).toEqual(expected);
  });
});
