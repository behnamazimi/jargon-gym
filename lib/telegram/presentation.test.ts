import { describe, expect, it } from "vitest";
import type { TermCard } from "@/lib/jargon/term-card";
import { GOOD } from "@/lib/trace";
import {
  buildReadRevealKeyboard,
  formatIllustrationQuestion,
  formatIllustrationQuestionWithAnswer,
  formatReadPrompt,
  formatReviewQuestion,
  formatReviewQuestionWithAnswer,
  formatReviewRated,
  formatTermMessage,
} from "./presentation";

const dangerousTerm: TermCard = {
  id: "term-1",
  term: `<script>alert("x")</script> & 'quote'`,
  category: "A&B <cat>",
  definition: `Definition with <b>fake bold</b> & "quotes" & 'apostrophes'`,
  example: null,
  mentalModel: null,
  discussion: null,
  antiExample: null,
  controversy: null,
  domainId: "domain-1",
  domainName: `Domain & <Co>`,
  relationships: [],
};

describe("presentation HTML escaping", () => {
  it("encodes &, <, > in interpolated term fields", () => {
    const message = formatTermMessage(dangerousTerm);
    expect(message).not.toContain("<script>");
    expect(message).toContain("&lt;script&gt;");
    expect(message).toContain("&amp;");
    // A fake <b> tag embedded in user data must be escaped, not rendered as markup.
    expect(message).toContain("&lt;b&gt;fake bold&lt;/b&gt;");
  });

  it("does not double-escape structural Telegram tags added by the formatter", () => {
    const message = formatTermMessage(dangerousTerm);
    // The module's own <b> wrapper around the (escaped) term name must remain literal markup.
    expect(message).toMatch(/<b>&lt;script&gt;/);
  });

  it("leaves quotes and apostrophes as literal characters — Telegram's HTML parser only decodes &lt; &gt; &amp; &quot;, so &apos; would render literally", () => {
    const message = formatReviewQuestion(dangerousTerm, 0, 1);
    expect(message).toContain(`"quotes"`);
    expect(message).toContain(`'apostrophes'`);
    expect(message).not.toContain("&apos;");
    expect(message).not.toContain("&quot;");
  });

  it("produces well-formed output for formatReviewQuestionWithAnswer", () => {
    const message = formatReviewQuestionWithAnswer(
      dangerousTerm,
      0,
      1,
      `<img src=x onerror=alert(1)>`,
      false,
      0,
    );
    expect(message).not.toContain("<img");
    expect(message).toContain("&lt;img");
    expect(message).toContain("&lt;script&gt;");
  });

  it("produces well-formed output for formatReviewRated", () => {
    const message = formatReviewRated(dangerousTerm, 0, 1, GOOD);
    expect(message).not.toContain("<script>");
    expect(message).toContain("&lt;script&gt;");
    expect(message).toContain("Good");
  });

  it("does not leak the definition in the masked read prompt", () => {
    const message = formatReadPrompt(dangerousTerm);
    expect(message).not.toContain(dangerousTerm.definition);
    expect(message).not.toContain("fake bold");
    expect(message).toContain("&lt;script&gt;");
  });

  it("escapes scenario text in formatIllustrationQuestion", () => {
    const message = formatIllustrationQuestion(0, 1, `<img src=x onerror=alert(1)>`);
    expect(message).not.toContain("<img");
    expect(message).toContain("&lt;img");
    expect(message).toContain("What does this illustrate?");
  });

  it("produces well-formed output for formatIllustrationQuestionWithAnswer", () => {
    const message = formatIllustrationQuestionWithAnswer(
      0,
      1,
      `<img src=x onerror=alert(1)>`,
      `<script>alert("x")</script>`,
      "None of these",
      false,
      0,
    );
    expect(message).not.toContain("<img");
    expect(message).toContain("&lt;img");
    expect(message).not.toContain("<script>");
    expect(message).toContain("&lt;script&gt;");
    expect(message).toContain("The correct answer was: <b>None of these</b>");
  });

  it("renders 'None of these' as a plain label, not escaped or altered", () => {
    const message = formatIllustrationQuestionWithAnswer(
      0,
      1,
      "A plain scenario.",
      "None of these",
      "None of these",
      true,
      1,
    );
    expect(message).toContain("Your answer:</b> None of these");
    expect(message).toContain("✅ <b>Correct!</b>");
  });
});

describe("buildReadRevealKeyboard", () => {
  it("returns a single Reveal button keyed to the term id", () => {
    const keyboard = buildReadRevealKeyboard("term-1");
    expect(keyboard.inline_keyboard).toEqual([
      [{ text: "Reveal", callback_data: "read:reveal:term-1" }],
    ]);
  });
});
