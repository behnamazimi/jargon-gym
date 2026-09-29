"use client";

import { useState } from "react";
import { saveAiCreditSettings } from "@/app/(private)/admin/ai/credits/actions";
import { AdminSection } from "@/components/admin/admin-section";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useAdminAction } from "@/hooks/use-admin-action";
import { useCreditSettingsDraft, type CreditDraft } from "@/hooks/use-credit-settings-draft";
import type { AiCreditSettingsView } from "@/lib/ai-credits/admin";

const FIELDS: { key: keyof CreditDraft; label: string; hint: string; min: number }[] = [
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

export function AdminAiCreditsSettings({
  settings,
  totalPeople,
}: {
  settings: AiCreditSettingsView;
  totalPeople: number;
}) {
  const { draft, setField, resetTo, values, changed, needsConfirmation } =
    useCreditSettingsDraft(settings);
  const { run, isPending, error, clearError } = useAdminAction();
  const [confirming, setConfirming] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  function save() {
    if (!values) return;
    setJustSaved(false);
    void run(() => saveAiCreditSettings(values), {
      onSuccess: () => {
        resetTo(values);
        setJustSaved(true);
      },
    });
  }

  function handleSave() {
    if (needsConfirmation) setConfirming(true);
    else save();
  }

  return (
    <AdminSection
      id="ai-credits-settings"
      title="Allowance and costs"
      description="Changes apply to everyone straight away. Raising the allowance is safe. Lowering it takes credits away from people who are mid-use."
    >
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
              onChange={(event) => {
                clearError();
                setJustSaved(false);
                setField(key, event.target.value);
              }}
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
      {!values && changed ? (
        <p role="alert" className="m-0 text-sm text-error">
          Use whole numbers. Costs must be at least 1, and nothing above 1,000,000.
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          className="btn btn-primary min-h-11 w-full transition-transform active:scale-[0.96] sm:w-fit"
          disabled={isPending || !changed || !values}
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
      <ConfirmDialog
        isOpen={confirming}
        onOpenChange={setConfirming}
        title="Change allowance or costs?"
        description={`This applies to all ${totalPeople} ${totalPeople === 1 ? "person" : "people"} straight away.`}
        confirmLabel="Save changes"
        onConfirm={save}
      />
    </AdminSection>
  );
}
