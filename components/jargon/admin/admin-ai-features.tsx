"use client";

import { useState, useTransition } from "react";
import { setAiFeatureEnabled } from "@/app/(private)/admin/ai-credits/actions";

export type AiFeatureRow = {
  feature: "quiz" | "story";
  label: string;
  enabled: boolean;
  healthNote: string | null;
};

function FeatureSwitch({ row }: { row: AiFeatureRow }) {
  const [enabled, setEnabled] = useState(row.enabled);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleToggle(value: boolean) {
    setError(null);
    const previous = enabled;
    setEnabled(value);
    startTransition(async () => {
      const result = await setAiFeatureEnabled(row.feature, value);
      if (result.error) {
        setEnabled(previous);
        setError(result.error);
      }
    });
  }

  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div>
        <p className="m-0 font-medium text-base-content">{row.label}</p>
        {row.healthNote ? <p className="m-0 text-sm text-warning">{row.healthNote}</p> : null}
        {error ? (
          <p role="alert" className="m-0 text-sm text-error">
            {error}
          </p>
        ) : null}
      </div>
      <input
        type="checkbox"
        className="toggle toggle-primary"
        checked={enabled}
        disabled={isPending}
        onChange={(event) => handleToggle(event.target.checked)}
        aria-label={`Turn ${row.label} on`}
      />
    </li>
  );
}

export function AdminAiFeatures({ rows }: { rows: AiFeatureRow[] }) {
  return (
    <section className="rounded-lg border border-base-300">
      <div className="border-b border-base-300 px-4 py-3">
        <h2 className="m-0 text-lg font-semibold text-base-content">Features</h2>
        <p className="m-0 text-sm text-base-content/65">
          A feature switched off is off for everyone, including people with their own key. The
          credits switch above only stops use of the app&apos;s key.
        </p>
      </div>
      <ul className="m-0 list-none divide-y divide-base-300 p-0">
        {rows.map((row) => (
          <FeatureSwitch key={row.feature} row={row} />
        ))}
      </ul>
    </section>
  );
}
