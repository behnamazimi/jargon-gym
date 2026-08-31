import { describe, expect, it } from "vitest";
import type { TermCard } from "@/lib/jargon/term-card";
import {
  buildReadRevealKeyboard,
  buildTrueFalseKeyboard,
  formatReadPrompt,
  formatReviewQuestion,
  formatReviewQuestionWithAnswer,
  formatReviewRated,
  formatStatsMessage,
  formatTermMessage,
  formatTrueFalseQuestion,
  formatTrueFalseQuestionWithAnswer,
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
    const message = formatReviewRated(dangerousTerm, 0, 1, true);
    expect(message).not.toContain("<script>");
    expect(message).toContain("&lt;script&gt;");
    expect(message).toContain("Got it");
  });

  it("escapes collection names in the stats message", () => {
    const message = formatStatsMessage({
      activeCount: 1,
      pausedCount: 0,
      rollup: {
        read: { unseen: 0 },
        review: { unseen: 0 },
        quiz: { unseen: 0 },
      },
      activeCollections: [
        {
          id: "c1",
          name: `Collection & <script>`,
          percentage: 50,
          knownCount: 1,
          totalCount: 2,
          unknownCount: 1,
        },
      ],
    });
    expect(message).not.toContain("<script>");
    expect(message).toContain("&lt;script&gt;");
  });

  it("does not leak the definition in the masked read prompt", () => {
    const message = formatReadPrompt(dangerousTerm);
    expect(message).not.toContain(dangerousTerm.definition);
    expect(message).not.toContain("fake bold");
    expect(message).toContain("&lt;script&gt;");
  });

  it("escapes the term name and scenario text in formatTrueFalseQuestion", () => {
    const message = formatTrueFalseQuestion(dangerousTerm, 0, 1, `<img src=x onerror=alert(1)>`);
    expect(message).not.toContain("<script>");
    expect(message).not.toContain("<img");
    expect(message).toContain("&lt;script&gt;");
    expect(message).toContain("&lt;img");
  });

  it("produces well-formed output for formatTrueFalseQuestionWithAnswer", () => {
    const message = formatTrueFalseQuestionWithAnswer(
      dangerousTerm,
      0,
      1,
      `<img src=x onerror=alert(1)>`,
      true,
      false,
      false,
      0,
    );
    expect(message).not.toContain("<img");
    expect(message).toContain("&lt;img");
    expect(message).toContain("&lt;script&gt;");
    expect(message).toContain("Your answer:</b> True");
    expect(message).toContain("The correct answer was: <b>False</b>");
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

describe("buildTrueFalseKeyboard", () => {
  it("returns True/False buttons keyed to the session index", () => {
    const keyboard = buildTrueFalseKeyboard(2);
    expect(keyboard.inline_keyboard).toEqual([
      [
        { text: "True", callback_data: "quiztf:2:true" },
        { text: "False", callback_data: "quiztf:2:false" },
      ],
    ]);
  });
});
