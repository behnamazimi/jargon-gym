import { z } from "zod";

export function buildStorySchema(termIds: [string, ...string[]]) {
  return z.object({
    title: z.string().min(1).max(120),
    segments: z
      .array(
        z.object({
          text: z.string(),
          termId: z.enum(termIds).optional(),
        }),
      )
      .min(1)
      .max(200),
  });
}

export type StoryGenerationPayload = z.infer<ReturnType<typeof buildStorySchema>>;
