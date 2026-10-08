"use client";

import { useState } from "react";
import type { AiCreditSettingsView } from "@/lib/ai-credits/admin";
import { creditSettingsSchema, type CreditSettingsInput } from "@/lib/ai-credits/settings-schema";

export type CreditDraft = { [K in keyof CreditSettingsInput]: string };

/** An empty field is not a zero. */
function toNumber(value: string): number {
  return value.trim() === "" ? Number.NaN : Number(value);
}

function toDraft(values: CreditSettingsInput): CreditDraft {
  return {
    defaultAllowance: String(values.defaultAllowance),
    monthlyRefill: String(values.monthlyRefill),
    quizCreditsPerQuestion: String(values.quizCreditsPerQuestion),
    storyBaseCredits: String(values.storyBaseCredits),
    storyCreditsPerTerm: String(values.storyCreditsPerTerm),
    narrationCreditsPerThousand: String(values.narrationCreditsPerThousand),
    selfTopupAmount: String(values.selfTopupAmount),
  };
}

const KEYS = [
  "defaultAllowance",
  "monthlyRefill",
  "quizCreditsPerQuestion",
  "storyBaseCredits",
  "storyCreditsPerTerm",
  "narrationCreditsPerThousand",
  "selfTopupAmount",
] as const;

export function useCreditSettingsDraft(settings: AiCreditSettingsView) {
  const [draft, setDraft] = useState<CreditDraft>(() => toDraft(settings));

  const parsed = creditSettingsSchema.safeParse({
    defaultAllowance: toNumber(draft.defaultAllowance),
    monthlyRefill: toNumber(draft.monthlyRefill),
    quizCreditsPerQuestion: toNumber(draft.quizCreditsPerQuestion),
    storyBaseCredits: toNumber(draft.storyBaseCredits),
    storyCreditsPerTerm: toNumber(draft.storyCreditsPerTerm),
    narrationCreditsPerThousand: toNumber(draft.narrationCreditsPerThousand),
    selfTopupAmount: toNumber(draft.selfTopupAmount),
  });
  // Compared as numbers, so "030" or "1e3" saved as 30 or 1000 doesn't look unsaved.
  const changed = KEYS.some((key) =>
    parsed.success ? parsed.data[key] !== settings[key] : draft[key] !== String(settings[key]),
  );
  // Lowering what people get, or changing what things cost, hits everyone at once.
  const needsConfirmation =
    parsed.success &&
    (parsed.data.defaultAllowance < settings.defaultAllowance ||
      parsed.data.monthlyRefill < settings.monthlyRefill ||
      parsed.data.quizCreditsPerQuestion !== settings.quizCreditsPerQuestion ||
      parsed.data.storyBaseCredits !== settings.storyBaseCredits ||
      parsed.data.storyCreditsPerTerm !== settings.storyCreditsPerTerm ||
      parsed.data.narrationCreditsPerThousand !== settings.narrationCreditsPerThousand);

  return {
    draft,
    setField: (key: keyof CreditDraft, value: string) =>
      setDraft((current) => ({ ...current, [key]: value })),
    resetTo: (values: CreditSettingsInput) => setDraft(toDraft(values)),
    values: parsed.success ? parsed.data : null,
    changed,
    needsConfirmation,
  };
}
