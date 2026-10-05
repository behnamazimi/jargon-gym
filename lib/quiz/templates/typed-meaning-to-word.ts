import { maskWord } from "../text/mask";
import { QUIZ_COPY } from "./copy";
import { isReadyToType, textQuestion, typedFeedback } from "./typed";
import type { QuizTemplate } from "./types";

export const typedMeaningToWord: QuizTemplate = {
  id: "typed_meaning_to_word",
  kinds: ["vocabulary"],
  channels: ["web"],
  eligible: (term) => isReadyToType(term) && term.definition.trim().length > 0,
  async build(term, ctx) {
    // Another term with the same meaning would be a right answer we'd mark wrong.
    if ((await ctx.source.sameDefinition(term)).length > 0) return null;

    return textQuestion(term, {
      template: "typed_meaning_to_word",
      prompt: QUIZ_COPY[term.kind].typedMeaningToWord,
      quote: maskWord(term.definition.trim(), term.term),
    });
  },
  feedback: (question, passed, response) =>
    question.interaction === "text" ? typedFeedback(question, passed, response) : null,
};
