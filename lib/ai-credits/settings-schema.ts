import { z } from "zod";

export const creditSettingsSchema = z.object({
  defaultAllowance: z.number().int().min(0).max(1_000_000),
  monthlyRefill: z.number().int().min(0).max(1_000_000),
  quizCreditsPerQuestion: z.number().min(0.001).max(1000),
  storyBaseCredits: z.number().min(0).max(1000),
  storyCreditsPerTerm: z.number().min(0.001).max(1000),
  narrationCreditsPerThousand: z.number().min(0.001).max(1000),
  selfTopupAmount: z.number().int().min(1).max(10_000),
});

export type CreditSettingsInput = z.infer<typeof creditSettingsSchema>;

export const grantCreditsSchema = z.object({
  email: z.string().trim().min(1, "Enter an email."),
  amount: z.number().int().min(1, "Enter at least 1 credit.").max(10_000, "Grant at most 10,000."),
  note: z.string().trim().max(200).optional(),
  /** A day (YYYY-MM-DD); the credits lapse at the end of it, UTC. Blank means never. */
  expiresOn: z
    .string()
    .trim()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/, "Pick a date.")
    .optional(),
});
