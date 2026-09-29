"use client";

import Link from "next/link";
import { setAiFeatureEnabled } from "@/app/(private)/admin/ai/actions";
import { setNarrationEnabled } from "@/app/(private)/admin/ai/narration/actions";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSwitch } from "@/components/admin/admin-switch";
import type { AiHubRow } from "@/lib/admin/ai-hub";

function Control({ row }: { row: AiHubRow }) {
  if (row.state === "unknown") return <span className="badge badge-warning">Unknown</span>;
  if (row.state === "always-on") return <span className="badge">Always on</span>;

  const save =
    row.id === "narration"
      ? setNarrationEnabled
      : (next: boolean) => setAiFeatureEnabled(row.id, next);

  return (
    <div className="flex items-center gap-2">
      {row.state === "mixed" ? <span className="badge badge-warning">Mixed</span> : null}
      <AdminSwitch label={`Turn ${row.label} on`} value={row.state === "on"} save={save} />
    </div>
  );
}

export function AdminAiHubClient({ rows }: { rows: AiHubRow[] }) {
  return (
    <>
      <AdminPageHeader
        title="AI features"
        description="Every feature that calls an AI service. A feature switched off is off for everyone, including people with their own key."
      />
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {rows.map((row) => (
          <li key={row.id} className="rounded-lg border border-base-300 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="m-0 text-base font-semibold text-base-content">{row.label}</h2>
                <p className="m-0 text-sm text-base-content/65">
                  {row.vendor} · {row.billing === "credits" ? "Uses AI credits" : "Not charged"}
                </p>
              </div>
              <Control row={row} />
            </div>
            <p className="mb-0 mt-2 text-sm text-base-content/65">Sends: {row.sends}</p>
            <p className="m-0 mt-1 text-sm text-base-content/65">Limit: {row.limit}</p>
            {row.state === "always-on" ? (
              <p className="m-0 mt-1 text-sm text-base-content/50">
                No switch yet: this feature does not read a setting.
              </p>
            ) : null}
            {row.healthNote ? (
              <p className="m-0 mt-1 text-sm text-warning">{row.healthNote}</p>
            ) : null}
            {row.id === "term_evaluation" ? null : (
              <Link href={row.manageHref} className="link mt-2 inline-block text-sm">
                Manage
              </Link>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
