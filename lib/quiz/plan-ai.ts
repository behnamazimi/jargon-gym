import type { DistractorSource } from "./distractors";
import { orderTemplates } from "./plan";
import type { Rng } from "./random";
import type { QuizTemplate } from "./templates/types";
import type { QuizQuestion, QuizTerm } from "./types";

/** A question the model will write for a term. */
export type AiSlot = { term: QuizTerm; template: QuizTemplate };

/** Who writes each term's question: built here without the model, or by the model. */
export type AiQuizPlan = {
  terms: QuizTerm[];
  built: Map<string, QuizQuestion>;
  slots: AiSlot[];
};

/** The model can write a template for any term; the others need what the term has. */
function isEligibleForAi(template: QuizTemplate, term: QuizTerm): boolean {
  return template.ai ? true : template.eligible(term);
}

/**
 * Assigns each term a template the same way the simple quiz does, except that
 * a template the model can write doesn't need the term's own example. Templates
 * that can't be written by the model (typed ones) are built here, so the model
 * is only asked for, and only charged for, the rest.
 */
export async function planAiQuiz(
  terms: QuizTerm[],
  source: DistractorSource,
  rng: Rng = Math.random,
): Promise<AiQuizPlan> {
  const built = new Map<string, QuizQuestion>();
  const slots = new Map<string, AiSlot>();

  await Promise.all(
    terms.map(async (term) => {
      for (const template of orderTemplates(term, "web", rng, isEligibleForAi)) {
        if (template.ai) {
          slots.set(term.id, { term, template });
          return;
        }
        const question = await template.build(term, { source, rng });
        if (question) {
          built.set(term.id, question);
          return;
        }
      }
    }),
  );

  return {
    terms,
    built,
    slots: terms.flatMap((term) => slots.get(term.id) ?? []),
  };
}
