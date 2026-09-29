"use client";

import { setAiFeatureEnabled } from "@/app/(private)/admin/ai-credits/actions";
import { AdminSection } from "@/components/admin/admin-section";
import { AdminSwitch } from "@/components/admin/admin-switch";

export type AiFeatureRow = {
  feature: "quiz" | "story";
  label: string;
  /** Null when the feature's settings row couldn't be read. */
  enabled: boolean | null;
  healthNote: string | null;
};

function FeatureRow({ row }: { row: AiFeatureRow }) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div>
        <p className="m-0 font-medium text-base-content">{row.label}</p>
        {row.enabled === null ? (
          <p className="m-0 text-sm text-warning">
            Couldn&apos;t read this feature&apos;s settings.
          </p>
        ) : null}
        {row.healthNote ? <p className="m-0 text-sm text-warning">{row.healthNote}</p> : null}
      </div>
      {row.enabled === null ? (
        <span className="badge badge-warning">Unknown</span>
      ) : (
        <AdminSwitch
          label={`Turn ${row.label} on`}
          value={row.enabled}
          save={(next) => setAiFeatureEnabled(row.feature, next)}
        />
      )}
    </li>
  );
}

export function AdminAiFeatures({ rows }: { rows: AiFeatureRow[] }) {
  return (
    <AdminSection
      id="ai-features"
      title="Features"
      description="A feature switched off is off for everyone, including people with their own key. The credits switch above only stops use of the app's key."
    >
      <ul className="m-0 list-none divide-y divide-base-300 rounded-lg border border-base-300 p-0">
        {rows.map((row) => (
          <FeatureRow key={row.feature} row={row} />
        ))}
      </ul>
    </AdminSection>
  );
}
