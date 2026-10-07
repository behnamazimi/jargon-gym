import { AdminSection } from "@/components/admin/admin-section";
import { AdminStat } from "@/components/admin/admin-stat";
import { refundsLookHigh } from "@/lib/ai-credits/health";
import type { AiCreditSummary } from "@/lib/ai-credits/admin";

function percent(part: number, whole: number): string {
  if (whole === 0 || part === 0) return "0%";
  const share = (part / whole) * 100;
  return share < 1 ? "<1%" : `${Math.round(share)}%`;
}

function people(count: number): string {
  return `${count} ${count === 1 ? "person" : "people"}`;
}

export function AdminAiCreditsSummary({ summary }: { summary: AiCreditSummary }) {
  return (
    <AdminSection id="ai-credits-summary" title="Is it working?">
      {refundsLookHigh(summary) ? (
        <p
          role="alert"
          className="m-0 rounded-lg bg-warning/15 px-3 py-2 text-sm text-base-content"
        >
          Many requests in the last 24 hours failed and were refunded. Check that the app&apos;s AI
          key is valid and has quota.
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <AdminStat
          label="Used AI credits"
          value={summary.usersWithUse}
          hint={`${percent(summary.usersWithUse, summary.totalUsers)} of ${people(summary.totalUsers)}`}
        />
        <AdminStat
          label="Ran out"
          value={summary.usersExhausted}
          hint={`${percent(summary.usersExhausted, summary.usersWithUse)} of those who used them. Can't afford another request.`}
        />
        <AdminStat
          label="Credits spent"
          value={summary.creditsSpent}
          hint="All time, net of refunds"
        />
        <AdminStat label="Requests, last 24 hours" value={summary.spends24h} />
        <AdminStat
          label="Refunded, last 24 hours"
          value={summary.refunds24h}
          hint="Failed requests"
        />
      </div>
    </AdminSection>
  );
}
