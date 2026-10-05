import { z } from "zod";
import { DOMAIN_LANGUAGES } from "@/lib/terms/languages";
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
  z.object({
    ...base,
    interaction: z.literal("text"),
    acceptedAnswers: z.array(z.string()).min(1),
    language: z.enum(DOMAIN_LANGUAGES),
    hint: z.string().optional(),
  }),
]);

/** Guards questions read back from storage, which may predate the current shape. */
export function isQuizQuestion(value: unknown): value is QuizQuestion {
  return quizQuestionSchema.safeParse(value).success;
}
