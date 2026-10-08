import { describe, expect, it } from "vitest";
import type { QuizQuestion } from "@/lib/quiz/types";
import type { TermCard } from "@/lib/terms/term-card";
import { GOOD } from "@/lib/trace";
import {
  buildReadRevealKeyboard,
  buildQuizKeyboard,
  formatQuizQuestion,
  formatQuizQuestionWithAnswer,
  formatReadPrompt,
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
  note: null,
  collectionId: "collection-1",
  collectionName: `Collection & <Co>`,
  collectionLanguage: "en",
  relationships: [],
};

const dangerousQuestion: QuizQuestion = {
  interaction: "choice",
  template: "masked_example",
  termId: "term-1",
  prompt: `Which one, with "quotes" and 'apostrophes'?`,
  quote: "<img src=x onerror=alert(1)>",
  options: [{ id: "term-1", text: "<script>alert(1)</script>" }],
  correctOptionIds: ["term-1"],
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
    const message = formatQuizQuestion(dangerousQuestion, 0, 1);
    expect(message).toContain(`"quotes"`);
    expect(message).toContain(`'apostrophes'`);
    expect(message).not.toContain("&apos;");
    expect(message).not.toContain("&quot;");
  });

  it("escapes the quote and answers in formatQuizQuestionWithAnswer", () => {
    const message = formatQuizQuestionWithAnswer(
      dangerousQuestion,
      0,
      1,
      `<img src=x onerror=alert(1)>`,
      `<script>alert("x")</script>`,
      false,
      0,
    );
    expect(message).not.toContain("<img");
    expect(message).toContain("&lt;img");
    expect(message).not.toContain("<script>");
    expect(message).toContain("&lt;script&gt;");
    expect(message).toContain("The correct answer was: <b>&lt;script&gt;");
  });

  it("produces well-formed output for formatReviewRated", () => {
    const message = formatReviewRated(dangerousTerm, 0, 1, GOOD);
    expect(message).not.toContain("<script>");
    expect(message).toContain("&lt;script&gt;");
    expect(message).toContain("Good");
  });

  it("escapes a note and labels it", () => {
    const message = formatTermMessage({
      ...dangerousTerm,
      note: `See <b>this</b> & that`,
    });
    expect(message).toContain("📝 <b>Note:</b>");
    expect(message).toContain("&lt;b&gt;this&lt;/b&gt;");
    expect(message).toContain("&amp; that");
    expect(message).not.toContain("<b>this</b>");
  });

  it("does not leak the definition in the masked read prompt", () => {
    const message = formatReadPrompt(dangerousTerm);
    expect(message).not.toContain(dangerousTerm.definition);
    expect(message).not.toContain("fake bold");
    expect(message).toContain("&lt;script&gt;");
  });
});

describe("quiz question formatting", () => {
  const long = "A fairly long definition that would not fit on a button face at all";
  const choice: QuizQuestion = {
    interaction: "choice",
    template: "term_to_meaning",
    termId: "t1",
    prompt: "What does it mean?",
    options: [
      { id: "t1", text: long },
      { id: "t2", text: "Short" },
    ],
    correctOptionIds: ["t1"],
  };
  const boolean: QuizQuestion = {
    interaction: "boolean",
    template: "does_it_fit",
    termId: "t1",
    prompt: "Is this an example?",
    quote: "A scenario.",
    correctAnswer: false,
  };

  it("lists long answers in the message and numbers the buttons", () => {
    expect(formatQuizQuestion(choice, 0, 3)).toContain(`1. ${long}`);
    const keyboard = buildQuizKeyboard(choice, 0);
    expect(keyboard.inline_keyboard[0].map((b) => b.text)).toEqual(["1", "2"]);
    expect(keyboard.inline_keyboard[0][0]).toMatchObject({ callback_data: "quiz:0:t1" });
  });

  it("shows short answers on the buttons themselves", () => {
    const short: QuizQuestion = {
      ...choice,
      options: [
        { id: "t1", text: "Alpha" },
        { id: "t2", text: "Beta" },
      ],
    };
    expect(formatQuizQuestion(short, 0, 1)).not.toContain("1. Alpha");
    expect(buildQuizKeyboard(short, 2).inline_keyboard[0].map((b) => b.text)).toEqual([
      "Alpha",
      "Beta",
    ]);
  });

  it("offers Yes and No for boolean questions and explains anti-examples", () => {
    const keyboard = buildQuizKeyboard(boolean, 1);
    expect(keyboard.inline_keyboard[0]).toEqual([
      { text: "Yes", callback_data: "quiz:1:yes" },
      { text: "No", callback_data: "quiz:1:no" },
    ]);
    expect(formatQuizQuestion(boolean, 0, 1)).toContain("<blockquote>A scenario.</blockquote>");

    const answered = formatQuizQuestionWithAnswer(boolean, 0, 1, "Yes", "No", false, 0);
    expect(answered).toContain("anti-example");
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
