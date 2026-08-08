"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ReviewPreset } from "@/lib/smart-queue";

type ReviewPresetPanelProps = {
  initialPreset: ReviewPreset;
  onSave: (preset: ReviewPreset) => Promise<{ error?: string }>;
};

const PRESET_OPTIONS: Array<{
  id: ReviewPreset;
  label: string;
  description: string;
}> = [
  {
    id: "balanced",
    label: "Balanced",
    description: "Default mix of new, struggling, and stale terms.",
  },
  {
    id: "learn_new",
    label: "Learn new first",
    description: "Prioritize never-read terms and recently added content.",
  },
  {
    id: "drill_weak",
    label: "Drill weak spots",
    description: "Focus on terms you're struggling with or forgot.",
  },
];

export function ReviewPresetPanel({ initialPreset, onSave }: ReviewPresetPanelProps) {
  const [preset, setPreset] = useState<ReviewPreset>(initialPreset);
  const [savedPreset, setSavedPreset] = useState<ReviewPreset>(initialPreset);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const hasChanges = preset !== savedPreset;

  async function handleSave() {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const result = await onSave(preset);

    setIsSaving(false);

    if (result.error) {
      setErrorMessage(result.error);
    } else {
      setSavedPreset(preset);
      setSuccessMessage("Review preset saved.");
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {PRESET_OPTIONS.map((option) => (
          <label
            key={option.id}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-base-300 p-4 transition-colors hover:border-primary has-[:checked]:border-primary has-[:checked]:bg-primary/5"
          >
            <input
              type="radio"
              name="review-preset"
              value={option.id}
              checked={preset === option.id}
              onChange={() => setPreset(option.id)}
              className="radio radio-primary radio-sm mt-0.5 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{option.label}</div>
              <div className="mt-1 text-xs text-base-content/60">{option.description}</div>
            </div>
          </label>
        ))}
      </div>

      {errorMessage ? (
        <div className="text-sm text-error">{errorMessage}</div>
      ) : successMessage ? (
        <div className="text-sm text-success">{successMessage}</div>
      ) : null}

      <Button type="button" onClick={handleSave} isDisabled={!hasChanges || isSaving} size="sm">
        {isSaving ? "Saving..." : "Save preset"}
      </Button>
    </div>
  );
}
