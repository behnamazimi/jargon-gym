import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const PAGES_DIR = __dirname;

/** Literal uses AGENTS.md allows; everything else says "terms". */
const ALLOWED_JARGON = [/real jargon/i, /a new job's jargon/i];

const pages = readdirSync(PAGES_DIR)
  .filter((name) => name.endsWith(".mdx"))
  .map((name) => ({ name, text: readFileSync(join(PAGES_DIR, name), "utf8") }));

describe("content pages copy", () => {
  it("finds the pages", () => {
    expect(pages.length).toBeGreaterThan(0);
  });

  it.each(pages)("$name says terms, not jargon", ({ text }) => {
    const cleaned = ALLOWED_JARGON.reduce((rest, allowed) => rest.replace(allowed, ""), text);
    expect(cleaned).not.toMatch(/jargon/i);
  });
});
