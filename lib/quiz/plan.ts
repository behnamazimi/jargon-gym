import { TEMPLATE_WEIGHTS } from "./mix";
import type { Rng } from "./random";
import { templatesFor } from "./templates/registry";
import type { QuizTemplate } from "./templates/types";
import type { QuizChannel, QuizTerm } from "./types";

/** The templates a term can use, in a weighted random order (higher weight
 *  tends to come first). The builder tries them in this order. */
export function orderTemplates(term: QuizTerm, channel: QuizChannel, rng: Rng): QuizTemplate[] {
  return templatesFor(term.kind, channel)
    .filter((template) => template.eligible(term))
    .map((template) => ({ template, key: rng() ** (1 / TEMPLATE_WEIGHTS[template.id]) }))
    .sort((a, b) => b.key - a.key)
    .map(({ template }) => template);
}
