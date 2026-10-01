import { describe, expect, it } from "vitest";
import { findSimilarName } from "./similar-name";

const owned = ["Startup Finance", "Dutch at work", "Rust", "Biology 1"];

describe("findSimilarName", () => {
  it.each([
    ["Startup finanse", { kind: "near", name: "Startup Finance" }],
    ["  startup   finance ", { kind: "exact", name: "Startup Finance" }],
    ["Startup\u00A0Finance", { kind: "exact", name: "Startup Finance" }],
    ["Startup Finance\u200B", { kind: "exact", name: "Startup Finance" }],
    ["Dutch at word", { kind: "near", name: "Dutch at work" }],
    ["Startup Fiannce", { kind: "near", name: "Startup Finance" }],
    ["Ruby", null],
    ["Biology 2", null],
    ["Biology 1", { kind: "exact", name: "Biology 1" }],
    ["Chemistry", null],
    ["", null],
    ["   ", null],
  ])("%j", (input, expected) => {
    expect(findSimilarName(input, owned)).toEqual(expected);
  });

  it("ignores very short names that differ", () => {
    expect(findSimilarName("Gu", ["Go"])).toBeNull();
  });

  it("picks the closest of several candidates", () => {
    expect(findSimilarName("Kubernetes basicz", ["Kubernetes bases", "Kubernetes basics"])).toEqual(
      {
        kind: "near",
        name: "Kubernetes basics",
      },
    );
  });

  it("returns null for an empty list", () => {
    expect(findSimilarName("Anything", [])).toBeNull();
  });
});
