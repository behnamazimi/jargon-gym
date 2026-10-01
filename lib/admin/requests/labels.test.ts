import { describe, expect, it } from "vitest";
import { DECLINE_REASONS } from "@/lib/requests/types";
import { ADMIN_DECLINE_REASONS, ADMIN_STATUS, describeRequestShape } from "./labels";

describe("describeRequestShape", () => {
  const cases: [string, { kind: string; language: string; size: number | null }, string][] = [
    [
      "jargon with a size",
      { kind: "jargon", language: "en", size: 50 },
      "Jargon · English · about 50",
    ],
    ["definitions", { kind: "definitions", language: "nl", size: null }, "Definitions · Dutch"],
    [
      "vocabulary without a size",
      { kind: "vocabulary", language: "nl", size: null },
      "Vocabulary · Dutch",
    ],
  ];

  it.each(cases)("%s", (_name, request, expected) => {
    expect(describeRequestShape(request)).toBe(expected);
  });
});

describe("labels", () => {
  it("covers every decline reason", () => {
    expect(Object.keys(ADMIN_DECLINE_REASONS).sort()).toEqual([...DECLINE_REASONS].sort());
  });

  it("covers every status", () => {
    expect(Object.keys(ADMIN_STATUS).sort()).toEqual(
      [
        "requested",
        "in_progress",
        "needs_input",
        "merged",
        "ready",
        "declined",
        "cancelled",
      ].sort(),
    );
  });
});
