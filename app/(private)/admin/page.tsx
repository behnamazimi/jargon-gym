import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { requireAdminPage } from "@/lib/admin/page-guard";
import { loadAdminOverview } from "@/lib/admin/overview";
import { cn } from "@/lib/utils";

const TONE_CLASS = {
  error: "border-error/40 bg-error/5",
  warning: "border-warning/40 bg-warning/5",
  info: "border-base-300",
} as const;

function Stat({ label, value, hint }: { label: string; value: number | null; hint?: string }) {
  return (
    <div className="rounded-lg border border-base-300 px-3 py-3">
      <p className="m-0 text-xl font-semibold tabular-nums text-base-content">{value ?? "—"}</p>
      <p className="m-0 text-xs text-base-content/65">{label}</p>
      {hint ? <p className="m-0 mt-0.5 text-xs text-base-content/50">{hint}</p> : null}
    </div>
  );
}

export default async function AdminOverviewPage() {
  const { supabase } = await requireAdminPage();
  const { attention, stats } = await loadAdminOverview(supabase);

  return (
    <>
      <div className="max-md:sr-only">
        <h1 className="text-2xl font-semibold text-base-content">Overview</h1>
        <p className="mt-1 text-base text-base-content/65">
          What needs you, and how the app is doing.
        </p>
      </div>

      <section aria-labelledby="admin-attention" className="flex flex-col gap-3">
        <h2 id="admin-attention" className="m-0 text-base font-semibold text-base-content">
          Needs attention
        </h2>
        {attention.length === 0 ? (
          <p className="m-0 flex items-center gap-2 rounded-lg border border-base-300 px-4 py-3 text-sm text-base-content/65">
            <CheckCircle2 className="size-4 text-success" aria-hidden />
            Nothing needs you right now.
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {attention.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex flex-col gap-0.5 rounded-lg border px-4 py-3 no-underline transition-colors hover:bg-base-200",
                    TONE_CLASS[item.tone],
                  )}
                >
                  <span className="font-medium text-base-content">{item.title}</span>
                  <span className="text-sm text-base-content/65">{item.detail}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="admin-numbers" className="flex flex-col gap-3">
        <h2 id="admin-numbers" className="m-0 text-base font-semibold text-base-content">
          Numbers
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="People" value={stats.totalPeople} />
          <Stat label="Used AI credits" value={stats.usedCredits} />
          <Stat label="Credits spent" value={stats.creditsSpent} hint="All time, net of refunds" />
          <Stat
            label="AI credit spends, last 24 hours"
            value={stats.spends24h}
            hint="Own-key, narration and evaluation calls aren't counted"
          />
          <Stat label="Waiting for an invite" value={stats.waitlistPending} />
        </div>
      </section>
    </>
  );
}
