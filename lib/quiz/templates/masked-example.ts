import { containsWholeWord, maskWord } from "../text/mask";
import { DISTRACTOR_COUNT, MIN_DISTRACTORS } from "../mix";
import { QUIZ_COPY } from "./copy";
import { correctOptionText, pickCandidates, shuffledOptions } from "./choice";
import type { QuizTemplate } from "./types";

export const maskedExample: QuizTemplate = {
  id: "masked_example",
  kinds: ["terms", "vocabulary"],
  channels: ["web", "telegram"],
  eligible: (term) => {
    const example = term.example?.trim();
    return Boolean(example) && containsWholeWord(example!, term.term);
  },
  async build(term, ctx) {
    const distractors = (await pickCandidates(term, ctx)).slice(0, DISTRACTOR_COUNT);
    if (distractors.length < MIN_DISTRACTORS) return null;

    return {
      interaction: "choice",
      template: "masked_example",
      termId: term.id,
      prompt: QUIZ_COPY[term.kind].maskedExample,
      quote: maskWord(term.example!.trim(), term.term),
      options: shuffledOptions(
        [{ id: term.id, text: term.term }, ...distractors.map((d) => ({ id: d.id, text: d.term }))],
        ctx,
      ),
      correctOptionIds: [term.id],
    };
  },
  feedback(question, passed) {
    const correct = correctOptionText(question);
    return passed || !correct ? null : `The blank is ${correct}.`;
  },
};
