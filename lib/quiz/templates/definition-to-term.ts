import { maskWord } from "../text/mask";
import { DISTRACTOR_COUNT } from "../mix";
import type { QuizChoiceQuestion, QuizTerm } from "../types";
import { QUIZ_COPY } from "./copy";
import { correctOptionText, pickCandidates, shuffledOptions } from "./choice";
import type { BuildContext, QuizTemplate } from "./types";

/** Always buildable: with too few distractors it just shows fewer options. */
export async function buildDefinitionToTerm(
  term: QuizTerm,
  ctx: BuildContext,
): Promise<QuizChoiceQuestion> {
  const distractors = (await pickCandidates(term, ctx)).slice(0, DISTRACTOR_COUNT);

  return {
    interaction: "choice",
    template: "definition_to_term",
    termId: term.id,
    prompt: QUIZ_COPY[term.kind].definitionToTerm,
    quote: maskWord(term.definition.trim(), term.term),
    options: shuffledOptions(
      [{ id: term.id, text: term.term }, ...distractors.map((d) => ({ id: d.id, text: d.term }))],
      ctx,
    ),
    correctOptionIds: [term.id],
  };
}

export const definitionToTerm: QuizTemplate = {
  id: "definition_to_term",
  kinds: ["terms", "vocabulary"],
  channels: ["web", "telegram"],
  eligible: (term) => term.definition.trim().length > 0,
  build: (term, ctx) => buildDefinitionToTerm(term, ctx),
  feedback(question, passed) {
    const correct = correctOptionText(question);
    return passed || !correct ? null : `That definition is for ${correct}.`;
  },
};
