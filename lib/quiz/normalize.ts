import type { AiSlot } from "./plan-ai";
import type { QuizGenerationPayload } from "./schema";
import type { QuizQuestion } from "./types";

type RawQuizQuestion = QuizGenerationPayload["questions"][number];

const WIRE_TYPE = { choice: "multiple_choice", boolean: "true_false" } as const;

/**
 * Turns the model's questions into finished ones, one per slot. A slot whose
 * question is missing or unusable is left out, and the caller fills it in.
 * Throws only when the model returned nothing usable at all.
 */
export function normalizeQuizQuestions(
  raw: QuizGenerationPayload,
  slots: AiSlot[],
): QuizQuestion[] {
  const termIds = new Set(slots.map((slot) => slot.term.id));

  // Pass 1: strict match — only trust a question's own termId when it names a
  // real term in this quiz. A question that fails this never gets guessed into
  // the wrong term's slot, so one bad response can't misalign the rest.
  const byTermId = new Map<string, RawQuizQuestion>();
  const unmatchedQuestions: RawQuizQuestion[] = [];

  for (const question of raw.questions) {
    if (termIds.has(question.termId) && !byTermId.has(question.termId)) {
      byTermId.set(question.termId, question);
    } else {
      unmatchedQuestions.push(question);
    }
  }

  // Pass 2: pair whatever's left over positionally, among the leftovers only.
  const unmatchedTermIds = slots.map((slot) => slot.term.id).filter((id) => !byTermId.has(id));
  for (const [index, termId] of unmatchedTermIds.entries()) {
    const rawQuestion = unmatchedQuestions[index];
    if (rawQuestion) byTermId.set(termId, rawQuestion);
  }

  const normalized: QuizQuestion[] = [];

  for (const { term, template } of slots) {
    const ai = template.ai;
    const rawQuestion = byTermId.get(term.id);
    if (!ai || !rawQuestion || rawQuestion.type !== WIRE_TYPE[ai.interaction]) continue;

    const question = ai.finish(rawQuestion, term);
    if (question) normalized.push(question);
  }

  if (normalized.length === 0 && slots.length > 0) {
    throw new Error(
      `Could not build a valid quiz from the model response (${raw.questions.length} questions returned, none passed validation).`,
    );
  }

  return normalized;
}
