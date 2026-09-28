import { refundsLookHigh } from "@/lib/ai-credits/health";
import type { AiCreditSummary } from "@/lib/ai-credits/admin";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-base-300 px-3 py-3">
      <p className="m-0 text-xl font-semibold tabular-nums text-base-content">{value}</p>
      <p className="m-0 text-xs text-base-content/65">{label}</p>
      {hint ? <p className="m-0 mt-0.5 text-xs text-base-content/50">{hint}</p> : null}
    </div>
  );
}

function percent(part: number, whole: number): string {
  return whole === 0 ? "0%" : `${Math.round((part / whole) * 100)}%`;
}

export function AdminAiCreditsSummary({ summary }: { summary: AiCreditSummary }) {
  return (
    <section aria-labelledby="ai-credits-summary" className="flex flex-col gap-3">
      <h2 id="ai-credits-summary" className="m-0 text-base font-semibold text-base-content">
        Is it working?
      </h2>
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
        <Stat
          label="Used AI credits"
          value={`${summary.usersWithUse}`}
          hint={`${percent(summary.usersWithUse, summary.totalUsers)} of ${summary.totalUsers} people`}
        />
        <Stat
          label="Ran out"
          value={`${summary.usersExhausted}`}
          hint={`${percent(summary.usersExhausted, summary.usersWithUse)} of those who used them`}
        />
        <Stat
          label="Saved their own key"
          value={`${summary.usersWithOwnKey}`}
          hint={`${percent(summary.usersWithOwnKey, summary.usersWithUse)} of those who used credits`}
        />
        <Stat
          label="Credits spent"
          value={`${summary.creditsSpent}`}
          hint="All time, net of refunds"
        />
        <Stat label="Requests, last 24 hours" value={`${summary.spends24h}`} />
        <Stat
          label="Refunded, last 24 hours"
          value={`${summary.refunds24h}`}
          hint="Failed requests"
        />
      </div>
    </section>
  );
}
