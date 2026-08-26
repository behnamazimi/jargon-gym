import { describe, expect, it } from "vitest";
import type { TermCard } from "@/lib/jargon/term-card";
import {
  formatReviewQuestion,
  formatReviewQuestionWithAnswer,
  formatReviewRated,
  formatStatsMessage,
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
        read: { never: 0, stale: 0 },
        review: { never: 0, struggling: 0 },
        quiz: { never: 0, struggling: 0 },
      },
      activeCollections: [
        {
          id: "c1",
          name: `Collection & <script>`,
          percentage: 50,
          knownCount: 1,
          totalCount: 2,
          unknownNever: 1,
          unknownRecent: 0,
          unknownStale: 0,
        },
      ],
    });
    expect(message).not.toContain("<script>");
    expect(message).toContain("&lt;script&gt;");
  });
});
