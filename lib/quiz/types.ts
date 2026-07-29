import { z } from "zod";

export type QuizTermStatus = "known" | "unknown";

export type QuizQuestionStyle = "ai" | "simple";

export type QuizTerm = {
  id: string;
  term: string;
  definition: string;
  example: string | null;
  domainName: string;
};

export type QuizMcqQuestion = {
  type: "multiple_choice";
  termId: string;
  prompt: string;
  options: { id: string; text: string }[];
  correctOptionIds: string[];
};

export type QuizTrueFalseQuestion = {
  type: "true_false";
  termId: string;
  prompt: string;
  correctAnswer: boolean;
};

export type QuizQuestion = QuizMcqQuestion | QuizTrueFalseQuestion;

export type QuizAnswer = {
  termId: string;
  passed: boolean;
};

export type QuizableCollection = {
  id: string;
  name: string;
  knownCount: number;
  unknownCount: number;
};

export function buildQuizGenerationSchema() {
  return z.object({
    questions: z
      .array(
        z.object({
          type: z.enum(["multiple_choice", "true_false"]),
          termId: z.string().optional(),
          id: z.string().optional(),
          prompt: z.string(),
          options: z
            .array(
              z.object({
                id: z.string(),
                text: z.string(),
              }),
            )
            .optional(),
          correctOptionIds: z.array(z.string()).optional(),
          correctAnswer: z.boolean().optional(),
        }),
      )
      .min(1),
  });
}

export type QuizGenerationPayload = z.infer<ReturnType<typeof buildQuizGenerationSchema>>;

type RawQuizQuestion = QuizGenerationPayload["questions"][number];

function resolveRawTermId(
  question: RawQuizQuestion,
  terms: QuizTerm[],
  index: number,
): string | null {
  const candidates = [question.termId, question.id].filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );

  for (const candidate of candidates) {
    if (terms.some((term) => term.id === candidate)) return candidate;
  }

  if (index < terms.length) return terms[index].id;

  return null;
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
  if (options.length < 3) return null;

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
  const byTermId = new Map<string, RawQuizQuestion>();

  for (const [index, question] of raw.questions.entries()) {
    const termId = resolveRawTermId(question, terms, index);
    if (!termId || byTermId.has(termId)) continue;
    byTermId.set(termId, question);
  }

  const normalized: QuizQuestion[] = [];

  for (const [index, term] of terms.entries()) {
    const rawQuestion = byTermId.get(term.id) ?? raw.questions[index];
    if (!rawQuestion) continue;

    const termId = resolveRawTermId(rawQuestion, terms, index) ?? term.id;
    const question = normalizeOneQuestion(rawQuestion, termId);
    if (question) normalized.push(question);
  }

  if (normalized.length === 0) {
    throw new Error(
      `Could not build a valid quiz from the model response (${raw.questions.length} questions returned, none passed validation).`,
    );
  }

  return normalized;
}

export function gradeMcqAnswer(question: QuizMcqQuestion, selectedOptionIds: string[]): boolean {
  const selected = new Set(selectedOptionIds);
  const correct = new Set(question.correctOptionIds);

  if (selected.size !== correct.size) return false;

  for (const id of correct) {
    if (!selected.has(id)) return false;
  }

  return true;
}

export function gradeTrueFalseAnswer(question: QuizTrueFalseQuestion, answer: boolean): boolean {
  return answer === question.correctAnswer;
}
