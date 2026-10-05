import { maskWords } from "../text/mask";
import { DISTRACTOR_COUNT, MIN_DISTRACTORS } from "../mix";
import { QUIZ_COPY } from "./copy";
import { pickCandidates, shuffledOptions } from "./choice";
import type { QuizTemplate } from "./types";

export const termToMeaning: QuizTemplate = {
  id: "term_to_meaning",
  kinds: ["terms", "vocabulary"],
  channels: ["web", "telegram"],
  eligible: (term) => term.definition.trim().length > 0,
  async build(term, ctx) {
    const correctText = maskWords(term.definition.trim(), [term.term]);
    const seen = new Set([correctText.toLowerCase()]);

    const distractors = [];
    for (const candidate of await pickCandidates(term, ctx)) {
      const text = maskWords(candidate.definition.trim(), [term.term, candidate.term]);
      if (seen.has(text.toLowerCase())) continue;
      seen.add(text.toLowerCase());
      distractors.push({ id: candidate.id, text });
    }
    if (distractors.length < MIN_DISTRACTORS) return null;

    return {
      interaction: "choice",
      template: "term_to_meaning",
      termId: term.id,
      prompt: QUIZ_COPY[term.kind].termToMeaning(term.term),
      options: shuffledOptions(
        [{ id: term.id, text: correctText }, ...distractors.slice(0, DISTRACTOR_COUNT)],
        ctx,
      ),
      correctOptionIds: [term.id],
    };
  },
  feedback: () => null,
};
