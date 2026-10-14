import { describe, expect, it } from "vitest";
import { makeTerm, rngOf, sourceOf } from "../test-support";
import { dictation } from "./dictation";
import { quizFeedbackLine, templatesFor } from "./registry";

const geval = makeTerm({
  id: "t1",
  kind: "vocabulary",
  language: "nl",
  term: "het geval",
  definition: "case",
  dictationClip: "job-1",
  recognition: { posterior: 0.3, testCount: 1 },
});
const ctx = { source: sourceOf([]), rng: rngOf(0.1) };
const typed = (text: string) => ({ interaction: "text" as const, text });

describe("dictation", () => {
  it("is for vocabulary on the web, in simple quizzes only", () => {
    expect(templatesFor("vocabulary", "web").map((t) => t.id)).toContain("dictation");
    expect(templatesFor("terms", "web").map((t) => t.id)).not.toContain("dictation");
    expect(templatesFor("vocabulary", "telegram").map((t) => t.id)).not.toContain("dictation");
    expect(dictation.simpleOnly).toBe(true);
  });

  it("needs a word-only clip, one quiz answer and at most three words", () => {
    expect(dictation.eligible(geval)).toBe(true);
    expect(dictation.eligible({ ...geval, dictationClip: undefined })).toBe(false);
    expect(dictation.eligible({ ...geval, recognition: undefined })).toBe(false);
    expect(dictation.eligible({ ...geval, recognition: { posterior: null, testCount: 0 } })).toBe(
      false,
    );
    expect(dictation.eligible({ ...geval, term: "het is de moeite waard" })).toBe(false);
  });

  it("plays the clip and accepts the whole entry", async () => {
    const q = await dictation.build(geval, ctx);
    expect(q).toMatchObject({
      interaction: "text",
      template: "dictation",
      prompt: "Type what you hear.",
      acceptedAnswers: ["het geval"],
      language: "nl",
      dictation: { clipVersion: "job-1", meaning: "case" },
    });
    expect(q?.quote).toBeUndefined();
  });

  it("shows the meaning after the answer", async () => {
    const q = (await dictation.build(geval, ctx))!;
    expect(quizFeedbackLine(q, true, typed("het geval"))).toBe("“het geval” means: case");
    expect(quizFeedbackLine(q, false, typed("geval"))).toBe(
      "The answer is het geval. Check the article. It means: case",
    );
  });
});
