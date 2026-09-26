import { z } from "zod";

export function buildStorySchema(termIds: [string, ...string[]]) {
  const segment = z.object({
    text: z.string(),
    termId: z.enum(termIds).optional(),
  });
  return z.object({
    title: z.string().min(1).max(120),
    paragraphs: z
      .array(z.object({ segments: z.array(segment).min(1).max(60) }))
      .min(1)
      .max(20),
  });
}

export type StoryGenerationPayload = z.infer<ReturnType<typeof buildStorySchema>>;
