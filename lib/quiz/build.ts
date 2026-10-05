import type { DistractorSource } from "./distractors";
import { orderTemplates } from "./plan";
import type { Rng } from "./random";
import { buildDefinitionToTerm } from "./templates/definition-to-term";
import type { BuildContext } from "./templates/types";
import type { QuizChannel, QuizQuestion, QuizTerm } from "./types";

async function buildQuestionForTerm(
  term: QuizTerm,
  channel: QuizChannel,
  ctx: BuildContext,
): Promise<QuizQuestion> {
  for (const template of orderTemplates(term, channel, ctx.rng)) {
    const question = await template.build(term, ctx);
    if (question) return question;
  }
  return buildDefinitionToTerm(term, ctx);
}

/**
 * Builds one question per term, in the same order, without calling an AI
 * model. Each term gets the first template from its plan that the collection
 * can supply; the definition question is the last resort. Terms are built
 * concurrently because none of the work depends on another term.
 */
export function buildQuiz(
  terms: QuizTerm[],
  source: DistractorSource,
  channel: QuizChannel,
  rng: Rng = Math.random,
): Promise<QuizQuestion[]> {
  const ctx: BuildContext = { source, rng };
  return Promise.all(terms.map((term) => buildQuestionForTerm(term, channel, ctx)));
}
