import { describe, expect, it } from "vitest";
import { normalizeKnownTerms } from "./known-terms";
import { requestFormSchema } from "./schema";

const base = { topic: "Kubernetes for product managers", kind: "jargon", language: "en" } as const;

describe("requestFormSchema", () => {
  const cases: [string, Record<string, unknown>, boolean][] = [
    ["a plain request", base, true],
    ["a trimmed topic", { ...base, topic: "  Helm  " }, true],
    ["a topic that is too short", { ...base, topic: "ab" }, false],
    ["a topic of only spaces", { ...base, topic: "     " }, false],
    ["a topic that is too long", { ...base, topic: "x".repeat(121) }, false],
    ["a jargon level", { ...base, level: "basics" }, true],
    ["a vocabulary level on jargon", { ...base, level: "a1_a2" }, false],
    ["a vocabulary level on vocabulary", { ...base, kind: "vocabulary", level: "b1_plus" }, true],
    ["a jargon level on vocabulary", { ...base, kind: "vocabulary", level: "new" }, false],
    ["a listed size", { ...base, size: 50 }, true],
    ["an unlisted size", { ...base, size: 30 }, false],
    ["an unsupported language", { ...base, language: "fr" }, false],
    ["an unknown kind", { ...base, kind: "definitions" }, false],
    ["known terms within the cap", { ...base, knownTerms: "pod\nhelm chart" }, true],
    [
      "too many known terms",
      { ...base, knownTerms: Array.from({ length: 51 }, (_, i) => `t${i}`).join("\n") },
      false,
    ],
  ];

  it.each(cases)("%s", (_name, input, ok) => {
    expect(requestFormSchema.safeParse(input).success).toBe(ok);
  });

  it("trims the topic and defaults email on", () => {
    const parsed = requestFormSchema.parse({ ...base, topic: "  Helm  " });
    expect(parsed.topic).toBe("Helm");
    expect(parsed.notifyEmail).toBe(true);
  });
});

describe("normalizeKnownTerms", () => {
  const cases: [string, string | undefined, string | null][] = [
    ["nothing", undefined, null],
    ["only blank lines", "\n  \n", null],
    ["trims and drops blanks", " pod \n\n helm chart ", "pod\nhelm chart"],
    ["folds repeats ignoring case", "Pod\npod\nPOD", "Pod"],
    ["handles CRLF", "pod\r\ningress", "pod\ningress"],
  ];

  it.each(cases)("%s", (_name, input, expected) => {
    expect(normalizeKnownTerms(input)).toEqual({ ok: true, value: expected });
  });

  it("refuses a line over 100 characters", () => {
    expect(normalizeKnownTerms("x".repeat(101)).ok).toBe(false);
  });

  it("allows exactly 50 terms", () => {
    const fifty = Array.from({ length: 50 }, (_, i) => `t${i}`).join("\n");
    expect(normalizeKnownTerms(fifty).ok).toBe(true);
  });
});
