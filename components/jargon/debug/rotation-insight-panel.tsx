import { Gauge } from "lucide-react";
import type { RotationPoolInsight } from "@/lib/smart-queue/rotation-insight";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { QuizPanel, QuizPanelHeader, QuizPanelBody, QuizStat } from "@/components/jargon/quiz/quiz-ui";

function formatRate(rate: number): string {
  return rate >= 1 ? rate.toFixed(1) : rate.toFixed(2);
}

function formatDays(days: number | null): string {
  if (days === null) return "—";
  if (!Number.isFinite(days)) return "very long";
  const rounded = Math.round(days);
  return `${rounded}d`;
}

function PoolInsight({ pool }: { pool: RotationPoolInsight }) {
  if (pool.poolSize === 0) {
    return (
      <div className="space-y-2">
        <p className="m-0 text-sm font-semibold text-base-content/80">{pool.poolLabel}</p>
        <p className="m-0 text-xs text-base-content/50">No terms in this pool.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="m-0 text-sm font-semibold text-base-content/80">{pool.poolLabel}</p>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <QuizStat label="Pool size" value={pool.poolSize} />
        <QuizStat label="Never touched" value={pool.neverTouchedCount} />
        <QuizStat
          label="Stale 7d+"
          value={pool.staleCapCount}
          variant={pool.overSafeLine ? "primary" : "default"}
        />
        <QuizStat label="Struggling" value={pool.strugglingCount} />
        <QuizStat label="Recent pace" value={`${formatRate(pool.recentDailyRate)}/day`} />
        <QuizStat label="Projected cycle" value={formatDays(pool.projectedCycleDays)} />
        <QuizStat
          label="Safe pool size"
          value={pool.safePoolSize !== null ? Math.round(pool.safePoolSize) : "—"}
        />
        <QuizStat label="Rotation pool" value={pool.rotationPoolSize} />
      </dl>

      {pool.suggestions.length > 0 ? (
        <div className="space-y-2">
          {pool.suggestions.map((suggestion, index) => (
            <Alert key={index} className={pool.overSafeLine ? "alert-warning" : undefined}>
              <AlertDescription>{suggestion}</AlertDescription>
            </Alert>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function RotationInsightPanel({ pools }: { pools: RotationPoolInsight[] }) {
  if (pools.length === 0) return null;

  return (
    <QuizPanel>
      <QuizPanelHeader
        icon={Gauge}
        title="Rotation insight"
        description="How fast this pool actually cycles back around at the recent pace, and where the queue is bottlenecked — derived from each term's own last-activity snapshot, not a stored event log."
      />
      <QuizPanelBody className="space-y-6">
        {pools.map((pool) => (
          <PoolInsight key={pool.poolLabel} pool={pool} />
        ))}
      </QuizPanelBody>
    </QuizPanel>
  );
}
