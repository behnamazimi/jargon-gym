import { z } from "zod";

export function buildQuizGenerationSchema(termIds: string[]) {
  // Constrain termId to the actual pool. Providers with structured-output
  // support (Google structuredOutputs, Anthropic tool-use) enforce enums via
  // constrained decoding, so this stops hallucinated/mismatched ids at
  // generation time rather than catching them after the fact in normalize.ts.
  const termIdSchema =
    termIds.length > 0
      ? z.enum(termIds as [string, ...string[]]).optional()
      : z.string().optional();

  return z.object({
    questions: z
      .array(
        z.object({
          type: z.enum(["multiple_choice", "true_false"]),
          termId: termIdSchema,
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
