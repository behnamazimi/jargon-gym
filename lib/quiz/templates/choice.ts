import { DISTRACTOR_COUNT } from "../mix";
import { shuffle } from "../random";
import type { QuizQuestion, QuizTerm } from "../types";
import type { BuildContext } from "./types";
import type { DistractorTerm } from "../distractors";

const SPARE_CANDIDATES = 2;

/** Candidates for wrong options, with a couple spare so a filter can drop some. */
export async function pickCandidates(term: QuizTerm, ctx: BuildContext): Promise<DistractorTerm[]> {
  return ctx.source.pick(term, DISTRACTOR_COUNT + SPARE_CANDIDATES, {
    preferCategory: term.kind === "vocabulary",
  });
}

export function shuffledOptions(
  options: { id: string; text: string }[],
  ctx: BuildContext,
): { id: string; text: string }[] {
  return shuffle(options, ctx.rng);
}

export function correctOptionText(question: QuizQuestion): string | null {
  if (question.interaction !== "choice") return null;
  return (
    question.options.find((option) => question.correctOptionIds.includes(option.id))?.text ?? null
  );
}
