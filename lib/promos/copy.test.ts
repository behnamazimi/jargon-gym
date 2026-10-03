import { describe, expect, it } from "vitest";
import { PROMOS } from "./promos";

const NEVER_USE: [string, RegExp][] = [
  ["AI", /\bAI\b/],
  ["generating", /generat/i],
  ["automatic", /automatic/i],
  ["the admin", /\badmin\b/i],
  ["a percentage", /\d+\s?%/],
];

describe("promo copy", () => {
  const copy = PROMOS.flatMap((promo) => [promo.title, promo.body, promo.cta]);

  it.each(NEVER_USE)("never says %s", (_label, pattern) => {
    for (const text of copy) expect(text).not.toMatch(pattern);
  });

  it("links every promo to an app page", () => {
    for (const promo of PROMOS) expect(promo.href).toMatch(/^\/app\//);
  });
});
