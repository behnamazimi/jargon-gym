"use client";

import { useState, useTransition } from "react";
import { saveAiCreditSettings } from "@/app/(private)/admin/ai-credits/actions";
import type { AiCreditSettingsView } from "@/lib/ai-credits/admin";
import { creditSettingsSchema } from "@/lib/ai-credits/settings-schema";

type Draft = { [K in keyof Omit<AiCreditSettingsView, "enabled">]: string };

const FIELDS: { key: keyof Draft; label: string; hint: string }[] = [
  { key: "defaultAllowance", label: "Starter credits", hint: "Everyone gets this once, for good." },
  { key: "monthlyRefill", label: "Monthly credits", hint: "Refreshed each month, no rollover." },
  {
    key: "quizCreditsPerQuestion",
    label: "Credits per quiz question",
    hint: "Charged per question.",
  },
  { key: "storyCreditsPerTerm", label: "Credits per story term", hint: "Charged per term used." },
];

/** An empty field is not a zero. */
function toNumber(value: string): number {
  return value.trim() === "" ? Number.NaN : Number(value);
}

function toDraft(settings: AiCreditSettingsView): Draft {
  return {
    defaultAllowance: String(settings.defaultAllowance),
    monthlyRefill: String(settings.monthlyRefill),
    quizCreditsPerQuestion: String(settings.quizCreditsPerQuestion),
    storyCreditsPerTerm: String(settings.storyCreditsPerTerm),
  };
}

export function AdminAiCreditsSettings({ settings }: { settings: AiCreditSettingsView }) {
  const saved = toDraft(settings);
  const [draft, setDraft] = useState<Draft>(saved);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const parsed = creditSettingsSchema.safeParse({
    defaultAllowance: toNumber(draft.defaultAllowance),
    monthlyRefill: toNumber(draft.monthlyRefill),
    quizCreditsPerQuestion: toNumber(draft.quizCreditsPerQuestion),
    storyCreditsPerTerm: toNumber(draft.storyCreditsPerTerm),
  });
  const changed = FIELDS.some(({ key }) => draft[key] !== saved[key]);

  function handleSave() {
    if (!parsed.success) return;
    setError(null);

    startTransition(async () => {
      try {
        await saveAiCreditSettings(parsed.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save.");
      }
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
        {FIELDS.map(({ key, label, hint }) => (
          <label key={key} className="flex flex-col gap-1">
            <span className="text-sm font-medium text-base-content">{label}</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              className="input input-bordered min-h-11 w-full"
              value={draft[key]}
              disabled={isPending}
              onChange={(event) =>
                setDraft((current) => ({ ...current, [key]: event.target.value }))
              }
            />
            <span className="text-xs text-base-content/60">{hint}</span>
          </label>
        ))}
      </div>
      {error ? <p className="m-0 text-sm text-error">{error}</p> : null}
      {!parsed.success && changed ? (
        <p className="m-0 text-sm text-error">
          Use whole numbers. Costs must be at least 1, and nothing above 1,000,000.
        </p>
      ) : null}
      <button
        type="button"
        className="btn btn-primary min-h-11 w-full transition-transform active:scale-[0.96] sm:w-fit"
        disabled={isPending || !changed || !parsed.success}
        onClick={handleSave}
      >
        {isPending ? "Saving…" : "Save changes"}
      </button>
    </section>
  );
}
