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
      .min(3)
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
 */
export function buildQuizGenerationSchema(
  plan: [QuizGenerationSlot, ...QuizGenerationSlot[]],
): z.ZodType<QuizGenerationPayload> {
  const termIdSchema = z.enum(plan.map((slot) => slot.termId) as [string, ...string[]]);

  const questionSchemas = plan.map((slot) =>
    slot.type === "multiple_choice"
      ? buildMultipleChoiceSchema(termIdSchema)
      : buildTrueFalseSchema(termIdSchema),
  );

  return z.object({
    questions: z.tuple(
      questionSchemas as [(typeof questionSchemas)[number], ...(typeof questionSchemas)[number][]],
    ),
  }) as unknown as z.ZodType<QuizGenerationPayload>;
}
