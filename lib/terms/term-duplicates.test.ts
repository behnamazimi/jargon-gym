import { describe, expect, it } from "vitest";
import { findDuplicateTerm, mostUsedCategory } from "./term-duplicates";

const terms = [
  { id: "1", term: "SLA", category: "Legal" },
  { id: "2", term: "café", category: "Food" },
  { id: "3", term: "vergadering", category: "Work" },
  { id: "4", term: "Churn", category: "Growth" },
];

describe("findDuplicateTerm", () => {
  it.each([
    ["churn", "4"],
    ["  CHURN  ", "4"],
    ["SLA", "1"],
    ["café", "2"],
    ["cafe", undefined],
    ["de vergadering", undefined],
    ["vergadering", "3"],
    ["SLA (legal)", undefined],
    ["", undefined],
    ["   ", undefined],
  ])("%j", (input, id) => {
    expect(findDuplicateTerm(input, terms)?.id).toBe(id);
  });
});

describe("mostUsedCategory", () => {
  it.each([
    [[], ""],
    [[{ category: "" }, { category: "  " }, { category: null }], ""],
    [[{ category: "Legal" }], "Legal"],
    [[{ category: "A" }, { category: "B" }, { category: "B" }], "B"],
    [[{ category: "B" }, { category: "A" }], "A"],
    [[{ category: " B " }, { category: "B" }, { category: "A" }], "B"],
  ])("%j", (input, expected) => {
    expect(mostUsedCategory(input)).toBe(expected);
  });
});
