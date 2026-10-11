"use client";

import Link from "next/link";
import { GoalLobyaHead, GoalRing } from "@/components/illustrations/scenes/goal-team";
import {
  GOAL_TIER_HREFS,
  GOAL_TIER_LABELS,
  GOAL_TIERS,
  type DailyGoals,
  type GoalTier,
} from "@/lib/goals/levels";
import { goalProgress, type TierProgress } from "@/lib/goals/progress";
import type { GoalDay } from "@/lib/goals/settings";
import { cn } from "@/lib/utils";

const surface = "shadow-surface rounded-box bg-base-100 ring-1 ring-base-content/5";

export function IntroPanel() {
  return (
    <div className={cn(surface, "flex items-center gap-4 p-4 sm:p-5")}>
      <div className="flex shrink-0 -space-x-3" aria-hidden>
        {GOAL_TIERS.map((tier) => (
          <GoalLobyaHead key={tier} tier={tier} className="size-12" />
        ))}
      </div>
      <p className="m-0 text-sm text-base-content/70">
        Set a pace for each tier below. When you reach a goal, the lobyas celebrate with you.
      </p>
    </div>
  );
}

export function TodayPanel({ goals, day }: { goals: DailyGoals; day: GoalDay }) {
  const progress = goalProgress(goals, day.counts, day.celebrated);
  return (
    <section aria-labelledby="goals-today-heading" className={cn(surface, "p-4 sm:p-5")}>
      <h2 id="goals-today-heading" className="mb-3 text-base font-medium">
        Today
      </h2>
      <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0">
        {GOAL_TIERS.map((tier) => (
          <li key={tier}>
            <TodayRing tier={tier} progress={progress[tier]} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function TodayRing({ tier, progress }: { tier: GoalTier; progress: TierProgress }) {
  const { goal, done, met } = progress;
  const percent = goal ? Math.min(100, Math.round((done / goal) * 100)) : 0;
  const label = GOAL_TIER_LABELS[tier];

  return (
    <Link
      href={GOAL_TIER_HREFS[tier]}
      className="flex flex-col items-center gap-2 rounded-field py-2 transition-colors hover:bg-base-200/60"
      aria-label={
        goal
          ? `${label}: ${Math.min(done, goal)} of ${goal}${met ? ", done" : ""}`
          : `${label}: off`
      }
    >
      <GoalRing
        tier={tier}
        percent={goal ? percent : 0}
        met={met}
        off={!goal}
        className="size-20"
      />
      <div className="text-center leading-tight">
        <p className="m-0 text-sm font-medium">{label}</p>
        <p className="m-0 text-xs text-base-content/70 tabular-nums">
          {goal ? `${Math.min(done, goal)}/${goal}` : "Off"}
        </p>
      </div>
    </Link>
  );
}
