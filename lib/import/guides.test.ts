import { describe, expect, it } from "vitest";
import { APP_GUIDES, findGuide } from "./guides";

const NEVER_USE = /generating|ai-built|automatically|instantly|request|\bAI\b/i;

describe("app guides", () => {
  it("has a unique slug for every app", () => {
    const slugs = APP_GUIDES.map((guide) => guide.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it.each(APP_GUIDES)("$name has steps or says it has no export", (guide) => {
    if (guide.canExport) expect(guide.steps.length).toBeGreaterThan(0);
    else expect(guide.note).toBeTruthy();
  });

  it.each(APP_GUIDES)("$name uses no banned words", (guide) => {
    const text = [guide.summary, guide.note ?? "", ...guide.steps].join(" ");
    expect(text).not.toMatch(NEVER_USE);
  });

  it("finds a guide by slug", () => {
    expect(findGuide("quizlet")?.name).toBe("Quizlet");
    expect(findGuide("nope")).toBeUndefined();
  });
});
