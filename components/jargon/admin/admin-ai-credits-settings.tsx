"use client";

import { useState, useTransition } from "react";
import { saveAiCreditSettings } from "@/app/(private)/admin/ai-credits/actions";
import type { AiCreditSettingsView } from "@/lib/ai-credits/admin";
import { creditSettingsSchema, type CreditSettingsInput } from "@/lib/ai-credits/settings-schema";

type Draft = { [K in keyof CreditSettingsInput]: string };

const FIELDS: { key: keyof Draft; label: string; hint: string; min: number }[] = [
  {
    key: "defaultAllowance",
    label: "Starter credits",
    hint: "Everyone gets this once, for good.",
    min: 0,
  },
  {
    key: "monthlyRefill",
    label: "Monthly credits",
    hint: "Refreshed each month, no rollover.",
    min: 0,
  },
  {
    key: "quizCreditsPerQuestion",
    label: "Credits per quiz question",
    hint: "Charged per question.",
    min: 1,
  },
  {
    key: "storyCreditsPerTerm",
    label: "Credits per story term",
    hint: "Charged per term used.",
    min: 1,
  },
];

/** An empty field is not a zero. */
function toNumber(value: string): number {
  return value.trim() === "" ? Number.NaN : Number(value);
}

function toDraft(values: CreditSettingsInput): Draft {
  return {
    defaultAllowance: String(values.defaultAllowance),
    monthlyRefill: String(values.monthlyRefill),
    quizCreditsPerQuestion: String(values.quizCreditsPerQuestion),
    storyCreditsPerTerm: String(values.storyCreditsPerTerm),
  };
}

export function AdminAiCreditsSettings({ settings }: { settings: AiCreditSettingsView }) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(settings));
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const parsed = creditSettingsSchema.safeParse({
    defaultAllowance: toNumber(draft.defaultAllowance),
    monthlyRefill: toNumber(draft.monthlyRefill),
    quizCreditsPerQuestion: toNumber(draft.quizCreditsPerQuestion),
    storyCreditsPerTerm: toNumber(draft.storyCreditsPerTerm),
  });
  // Compared as numbers, so "030" or "1e3" saved as 30 or 1000 doesn't look unsaved.
  const changed = FIELDS.some(({ key }) =>
    parsed.success ? parsed.data[key] !== settings[key] : draft[key] !== String(settings[key]),
  );

  function handleChange(key: keyof Draft, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
    setJustSaved(false);
  }

  function handleSave() {
    if (!parsed.success) return;
    const values = parsed.data;
    setError(null);
    setJustSaved(false);

    startTransition(async () => {
      const result = await saveAiCreditSettings(values);
      if (result.error) {
        setError(result.error);
        return;
      }
      setDraft(toDraft(values));
      setJustSaved(true);
    });
  }

  return (
    <section aria-labelledby="ai-credits-settings" className="flex flex-col gap-3">
      <h2 id="ai-credits-settings" className="m-0 text-base font-semibold text-base-content">
        Allowance and costs
      </h2>
      <p className="m-0 text-sm text-base-content/65">
        Changes apply to everyone straight away. Raising the allowance is safe. Lowering it takes
        credits away from people who are mid-use.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map(({ key, label, hint, min }) => (
          <label key={key} className="flex flex-col gap-1">
            <span className="text-sm font-medium text-base-content">{label}</span>
            <input
              type="number"
              inputMode="numeric"
              min={min}
              className="input input-bordered min-h-11 w-full"
              value={draft[key]}
              disabled={isPending}
              onChange={(event) => handleChange(key, event.target.value)}
            />
            <span className="text-xs text-base-content/60">{hint}</span>
          </label>
        ))}
      </div>
      {error ? (
        <p role="alert" className="m-0 text-sm text-error">
          {error}
        </p>
      ) : null}
      {!parsed.success && changed ? (
        <p role="alert" className="m-0 text-sm text-error">
          Use whole numbers. Costs must be at least 1, and nothing above 1,000,000.
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          className="btn btn-primary min-h-11 w-full transition-transform active:scale-[0.96] sm:w-fit"
          disabled={isPending || !changed || !parsed.success}
          onClick={handleSave}
        >
          {isPending ? "Saving…" : "Save changes"}
        </button>
        {justSaved ? (
          <p role="status" className="m-0 text-sm text-success">
            Saved
          </p>
        ) : null}
      </div>
    </section>
  );
}
