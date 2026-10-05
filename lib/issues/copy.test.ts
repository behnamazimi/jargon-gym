import { describe, expect, it } from "vitest";
import { ISSUE_COPY } from "./copy";

function collect(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (value && typeof value === "object") {
    for (const item of Object.values(value)) collect(item, out);
  }
  return out;
}

const NEVER_USE: [string, RegExp][] = [
  ["the admin", /\badmin\b/i],
  ["jargon", /jargon/i],
  ["automatic", /automatic/i],
  ["AI", /\bAI\b/],
];

describe("issue copy", () => {
  const strings = collect(ISSUE_COPY);

  it.each(NEVER_USE)("never says %s", (_, pattern) => {
    expect(strings.filter((text) => pattern.test(text))).toEqual([]);
  });
});
