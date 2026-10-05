import { containsWholeWord, maskWord } from "../text/mask";
import { QUIZ_COPY } from "./copy";
import { isReadyToType, textQuestion, typedFeedback } from "./typed";
import type { QuizTemplate } from "./types";

export const typedCloze: QuizTemplate = {
  id: "typed_cloze",
  kinds: ["vocabulary"],
  channels: ["web"],
  eligible: (term) => {
    const example = term.example?.trim();
    return isReadyToType(term) && Boolean(example) && containsWholeWord(example!, term.term);
  },
  async build(term) {
    return textQuestion(term, {
      template: "typed_cloze",
      prompt: QUIZ_COPY[term.kind].typedCloze,
      quote: maskWord(term.example!.trim(), term.term),
      hint: `Meaning: ${maskWord(term.definition.trim(), term.term)}`,
    });
  },
  feedback: (question, passed, response) =>
    question.interaction === "text" ? typedFeedback(question, passed, response) : null,
};
