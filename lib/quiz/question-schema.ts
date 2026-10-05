import { z } from "zod";
import { QUIZ_TEMPLATE_IDS, type QuizQuestion } from "./types";

const base = {
  template: z.enum(QUIZ_TEMPLATE_IDS),
  termId: z.string(),
  prompt: z.string(),
  quote: z.string().optional(),
};

const quizQuestionSchema: z.ZodType<QuizQuestion> = z.discriminatedUnion("interaction", [
  z.object({
    ...base,
    interaction: z.literal("choice"),
    options: z.array(z.object({ id: z.string(), text: z.string() })),
    correctOptionIds: z.array(z.string()),
  }),
  z.object({
    ...base,
    interaction: z.literal("boolean"),
    correctAnswer: z.boolean(),
  }),
]);

/** Guards questions read back from storage, which may predate the current shape. */
export function isQuizQuestion(value: unknown): value is QuizQuestion {
  return quizQuestionSchema.safeParse(value).success;
}
