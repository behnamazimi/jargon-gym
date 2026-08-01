import { z } from "zod";

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
