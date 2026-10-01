import { z } from "zod";
import { DOMAIN_LANGUAGES } from "@/lib/jargon/languages";
import { normalizeKnownTerms } from "./known-terms";
import { REQUEST_KINDS, REQUEST_LEVELS, REQUEST_SIZES } from "./types";

const MIN_TOPIC_LENGTH = 3;
export const MAX_TOPIC_LENGTH = 120;

export const requestFormSchema = z
  .object({
    topic: z
      .string()
      .trim()
      .min(MIN_TOPIC_LENGTH, "Add a topic of at least 3 letters.")
      .max(MAX_TOPIC_LENGTH, "Keep the topic under 120 characters."),
    kind: z.enum(REQUEST_KINDS),
    language: z.enum(DOMAIN_LANGUAGES),
    level: z.string().optional(),
    size: z
      .number()
      .refine((size) => (REQUEST_SIZES as readonly number[]).includes(size))
      .optional(),
    knownTerms: z.string().max(10_000).optional(),
    notifyEmail: z.boolean().default(true),
  })
  .superRefine((value, ctx) => {
    if (value.level && !(REQUEST_LEVELS[value.kind] as readonly string[]).includes(value.level)) {
      ctx.addIssue({ code: "custom", path: ["level"], message: "Pick a level from the list." });
    }
    const known = normalizeKnownTerms(value.knownTerms);
    if (!known.ok) ctx.addIssue({ code: "custom", path: ["knownTerms"], message: known.message });
  });
