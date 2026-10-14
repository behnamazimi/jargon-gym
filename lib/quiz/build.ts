import type { DistractorSource } from "./distractors";
import { orderTemplates } from "./plan";
import type { Rng } from "./random";
import { buildDefinitionToTerm } from "./templates/definition-to-term";
import type { BuildContext, QuizTemplate } from "./templates/types";
import type { QuizChannel, QuizQuestion, QuizQuestionStyle, QuizTerm } from "./types";

async function buildQuestionForTerm(
  term: QuizTerm,
  channel: QuizChannel,
  style: QuizQuestionStyle,
  ctx: BuildContext,
): Promise<QuizQuestion> {
  const isEligible = (template: QuizTemplate, t: QuizTerm) =>
    !(style === "ai" && template.simpleOnly) && template.eligible(t);
  for (const template of orderTemplates(term, channel, ctx.rng, isEligible)) {
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
  style: QuizQuestionStyle = "simple",
  rng: Rng = Math.random,
): Promise<QuizQuestion[]> {
  const ctx: BuildContext = { source, rng };
  return Promise.all(terms.map((term) => buildQuestionForTerm(term, channel, style, ctx)));
}
