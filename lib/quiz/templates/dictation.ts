import { TYPED_MAX_WORDS } from "../mix";
import { QUIZ_COPY } from "./copy";
import { textQuestion, typedFeedback, wordCount } from "./typed";
import type { QuizTemplate } from "./types";

/** Plays the term's clip and asks the learner to type what they hear. */
export const dictation: QuizTemplate = {
  id: "dictation",
  kinds: ["vocabulary"],
  channels: ["web"],
  simpleOnly: true,
  eligible: (term) =>
    Boolean(term.dictationClip) &&
    (term.recognition?.testCount ?? 0) >= 1 &&
    wordCount(term.term) <= TYPED_MAX_WORDS,
  async build(term) {
    if (!term.dictationClip) return null;
    return {
      ...textQuestion(term, { template: "dictation", prompt: QUIZ_COPY[term.kind].dictation }),
      dictation: { clipVersion: term.dictationClip, meaning: term.definition.trim() },
    };
  },
  feedback(question, passed, response) {
    if (question.interaction !== "text" || !question.dictation) return null;
    const { meaning } = question.dictation;
    if (passed) return `“${question.acceptedAnswers[0]}” means: ${meaning}`;
    return `${typedFeedback(question, passed, response)} It means: ${meaning}`;
  },
};
