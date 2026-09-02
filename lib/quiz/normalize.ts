import type { QuizGenerationPayload } from "./schema";
import type { QuizQuestion, QuizTerm } from "./types";

type RawQuizQuestion = QuizGenerationPayload["questions"][number];

function resolveRawTermId(question: RawQuizQuestion, termIds: Set<string>): string | null {
  return termIds.has(question.termId) ? question.termId : null;
}

function resolveMcqCorrectOptionId(
  options: { id: string; text: string }[],
  correctOptionIds: string[] | undefined,
): string | null {
  if (!correctOptionIds?.length) return null;

  const optionIds = new Set(options.map((option) => option.id));
  const byExact = correctOptionIds.find((id) => optionIds.has(id));
  if (byExact) return byExact;

  const byLowercase = new Map(options.map((option) => [option.id.toLowerCase(), option.id]));
  for (const id of correctOptionIds) {
    const match = byLowercase.get(id.toLowerCase());
    if (match) return match;
  }

  return null;
}

function normalizeOneQuestion(question: RawQuizQuestion, termId: string): QuizQuestion | null {
  if (question.type === "true_false") {
    if (typeof question.correctAnswer !== "boolean") return null;

    return {
      type: "true_false",
      termId,
      prompt: question.prompt.trim(),
      correctAnswer: question.correctAnswer,
    };
  }

  if (question.type !== "multiple_choice") return null;

  const options = question.options?.filter((option) => option.id && option.text.trim()) ?? [];
  if (options.length < 4) return null;

  const correctOptionId = resolveMcqCorrectOptionId(options, question.correctOptionIds);
  if (!correctOptionId) return null;

  return {
    type: "multiple_choice",
    termId,
    prompt: question.prompt.trim(),
    options: options.slice(0, 5),
    correctOptionIds: [correctOptionId],
  };
}

export function normalizeQuizQuestions(
  raw: QuizGenerationPayload,
  terms: QuizTerm[],
): QuizQuestion[] {
  const termIds = new Set(terms.map((term) => term.id));

  // Pass 1: strict match — only trust a question's own termId/id when it names
  // a real term in this pool. A question that fails this never gets guessed
  // into the wrong term's slot, so one bad LLM response can't cascade
  // misalignment across the rest of the quiz.
  const byTermId = new Map<string, RawQuizQuestion>();
  const unmatchedQuestions: RawQuizQuestion[] = [];

  for (const question of raw.questions) {
    const termId = resolveRawTermId(question, termIds);
    if (termId && !byTermId.has(termId)) {
      byTermId.set(termId, question);
    } else {
      unmatchedQuestions.push(question);
    }
  }

  // Pass 2: pair whatever's left over positionally, among the leftovers only —
  // not by absolute index into the original arrays.
  const unmatchedTermIds = terms.map((term) => term.id).filter((id) => !byTermId.has(id));
  for (const [index, termId] of unmatchedTermIds.entries()) {
    const rawQuestion = unmatchedQuestions[index];
    if (rawQuestion) byTermId.set(termId, rawQuestion);
  }

  const normalized: QuizQuestion[] = [];

  for (const term of terms) {
    const rawQuestion = byTermId.get(term.id);
    if (!rawQuestion) continue;

    const question = normalizeOneQuestion(rawQuestion, term.id);
    if (question) normalized.push(question);
  }

  if (normalized.length === 0) {
    throw new Error(
      `Could not build a valid quiz from the model response (${raw.questions.length} questions returned, none passed validation).`,
    );
  }

  return normalized;
}
