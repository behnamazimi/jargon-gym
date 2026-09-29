import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSection } from "@/components/admin/admin-section";
import { AdminStat } from "@/components/admin/admin-stat";
import { requireAdminPage } from "@/lib/admin/page-guard";
import { loadAdminOverview } from "@/lib/admin/overview";
import { describeAudit } from "@/lib/admin/audit-labels";
import { formatAdminDateTime } from "@/lib/admin/format";
import { cn } from "@/lib/utils";

const TONE_CLASS = {
  error: "border-error/40 bg-error/5",
  warning: "border-warning/40 bg-warning/5",
  info: "border-base-300",
} as const;

export default async function AdminOverviewPage() {
  const { supabase } = await requireAdminPage();
  const { attention, stats, recent } = await loadAdminOverview(supabase);

  return (
    <>
      <AdminPageHeader title="Overview" description="What needs you, and how the app is doing." />

      <AdminSection id="admin-attention" title="Needs attention">
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
      </AdminSection>

      <AdminSection id="admin-numbers" title="Numbers">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <AdminStat label="People" value={stats.totalPeople} />
          <AdminStat label="Used AI credits" value={stats.usedCredits} />
          <AdminStat
            label="Credits spent"
            value={stats.creditsSpent}
            hint="All time, net of refunds"
          />
          <AdminStat
            label="AI credit spends, last 24 hours"
            value={stats.spends24h}
            hint="Own-key, narration and evaluation calls aren't counted"
          />
          <AdminStat label="Waiting for an invite" value={stats.waitlistPending} />
        </div>
      </AdminSection>
      <AdminSection
        id="admin-recent"
        title="Recent activity"
        action={
          <Link href="/admin/system/audit" className="link text-sm">
            Audit log
          </Link>
        }
      >
        {recent === null ? (
          <p className="m-0 text-sm text-base-content/65">Couldn&apos;t load recent activity.</p>
        ) : recent.length === 0 ? (
          <p className="m-0 text-sm text-base-content/65">Nothing recorded yet.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {recent.map((entry) => {
              const { label, summary } = describeAudit(entry.action, entry.details);
              return (
                <li key={entry.id} className="text-sm">
                  <span className="text-base-content/50">
                    {formatAdminDateTime(entry.createdAt)}
                  </span>{" "}
                  <span className="font-medium text-base-content">{label}</span>
                  {summary ? <span className="text-base-content/65">: {summary}</span> : null}
                </li>
              );
            })}
          </ul>
        )}
      </AdminSection>
    </>
  );
}
