import { z, type ZodTypeAny } from "zod";

export type QuizGenerationSlot = {
  termId: string;
  type: "multiple_choice" | "true_false";
};

type QuizGenerationQuestion =
  | {
      type: "multiple_choice";
      termId: string;
      prompt: string;
      options: { id: string; text: string }[];
      correctOptionIds: string[];
    }
  | {
      type: "true_false";
      termId: string;
      prompt: string;
      correctAnswer: boolean;
    };

export type QuizGenerationPayload = { questions: QuizGenerationQuestion[] };

function buildMultipleChoiceSchema(termIdSchema: ZodTypeAny) {
  return z.object({
    type: z.literal("multiple_choice"),
    termId: termIdSchema,
    prompt: z.string(),
    options: z
      .array(
        z.object({
          id: z.string(),
          text: z.string(),
        }),
      )
      .min(4)
      .max(5),
    correctOptionIds: z.array(z.string()).min(1),
  });
}

function buildTrueFalseSchema(termIdSchema: ZodTypeAny) {
  return z.object({
    type: z.literal("true_false"),
    termId: termIdSchema,
    prompt: z.string(),
    correctAnswer: z.boolean(),
  });
}

function buildPerSlotQuestionSchemas(
  plan: [QuizGenerationSlot, ...QuizGenerationSlot[]],
  termIdSchema: ZodTypeAny,
) {
  return plan.map((slot) =>
    slot.type === "multiple_choice"
      ? buildMultipleChoiceSchema(termIdSchema)
      : buildTrueFalseSchema(termIdSchema),
  );
}

/**
 * Builds a schema whose "questions" array is a fixed-length tuple with one
 * literal `type` per position, taken from `plan`. This is what actually
 * forces the model to hit the exact multiple_choice/true_false mix — a
 * free-text prompt instruction alone ("exactly N must be X") isn't reliably
 * followed by fast/cheap models, which tend to default to the simpler
 * true_false shape.
 *
 * `plan` must be non-empty — callers only reach here once they know there's
 * at least one term for the model to generate. The return type is asserted
 * rather than inferred: TS's mapped-tuple inference over a dynamically-built
 * array of union element schemas collapses to `never`, so `QuizGenerationPayload`
 * is declared by hand above instead and just needs to stay in sync with the
 * two shapes built here.
 *
 * Only used for providers whose structured-output JSON Schema conversion
 * supports positional tuples (`items` as an array of schemas). Google's
 * Gemini response_schema does not — see buildQuizGenerationObjectSchema.
 */
export function buildQuizGenerationSchema(
  plan: [QuizGenerationSlot, ...QuizGenerationSlot[]],
): z.ZodType<QuizGenerationPayload> {
  const termIdSchema = z.enum(plan.map((slot) => slot.termId) as [string, ...string[]]);
  const questionSchemas = buildPerSlotQuestionSchemas(plan, termIdSchema);

  return z.object({
    questions: z.tuple(
      questionSchemas as [(typeof questionSchemas)[number], ...(typeof questionSchemas)[number][]],
    ),
  }) as unknown as z.ZodType<QuizGenerationPayload>;
}

export type QuizGenerationRawObjectPayload = {
  questions: Record<string, QuizGenerationQuestion>;
};

function quizGenerationSlotKey(index: number): string {
  return `question_${index}`;
}

/**
 * Same per-slot type enforcement as buildQuizGenerationSchema, but shaped as
 * an object keyed by slot index rather than an array. Gemini's structured
 * output (response_schema) is a proto-backed OpenAPI subset whose `items`
 * field is singular — it rejects the positional/tuple-style JSON Schema
 * `items: [...]` that z.tuple produces, failing with "Invalid JSON payload
 * received. Unknown name \"items\" ... Proto field is not repeating, cannot
 * start list." Object properties don't have this restriction, so this shape
 * gets the same per-position type guarantee without ever emitting a tuple.
 * Use toQuizGenerationPayload to convert the result back into the ordered
 * array shape normalizeQuizQuestions expects.
 */
export function buildQuizGenerationObjectSchema(
  plan: [QuizGenerationSlot, ...QuizGenerationSlot[]],
): z.ZodType<QuizGenerationRawObjectPayload> {
  const termIdSchema = z.enum(plan.map((slot) => slot.termId) as [string, ...string[]]);
  const questionSchemas = buildPerSlotQuestionSchemas(plan, termIdSchema);

  const shape: Record<string, ZodTypeAny> = {};
  questionSchemas.forEach((schema, index) => {
    shape[quizGenerationSlotKey(index)] = schema;
  });

  return z.object({
    questions: z.object(shape),
  }) as unknown as z.ZodType<QuizGenerationRawObjectPayload>;
}

export function toQuizGenerationPayload(
  raw: QuizGenerationRawObjectPayload,
  plan: [QuizGenerationSlot, ...QuizGenerationSlot[]],
): QuizGenerationPayload {
  return {
    questions: plan.map((_, index) => raw.questions[quizGenerationSlotKey(index)]),
  };
}
