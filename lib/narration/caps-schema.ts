import { z } from "zod";

/** Blank (null) means no cap for terms; stories always keep a cap, since it is their only cost bound. */
export const capsSchema = z.object({
  term: z.number().int().min(1).max(1000).nullable(),
  story: z.number().int().min(1).max(1000),
});

export type CapsInput = z.infer<typeof capsSchema>;
