import { GOAL_TIERS, type DailyGoals, type GoalTier } from "./levels";

export type GoalDayCounts = Record<GoalTier, number>;

export type TierProgress = {
  goal: number | null;
  done: number;
  met: boolean;
};

export type GoalProgress = Record<GoalTier, TierProgress>;

export const EMPTY_GOAL_COUNTS: GoalDayCounts = { read: 0, review: 0, quiz: 0 };

/** A tier counts as met once its count reaches the goal or it was already
 *  celebrated today (which also covers running out of terms). */
export function goalProgress(
  goals: DailyGoals,
  counts: GoalDayCounts,
  celebrated: readonly GoalTier[] = [],
): GoalProgress {
  const progress = {} as GoalProgress;
  for (const tier of GOAL_TIERS) {
    const goal = goals[tier];
    const done = counts[tier];
    progress[tier] = {
      goal,
      done,
      met: goal !== null && (done >= goal || celebrated.includes(tier)),
    };
  }
  return progress;
}

function goalTiersSet(progress: GoalProgress): GoalTier[] {
  return GOAL_TIERS.filter((tier) => progress[tier].goal !== null);
}

export function metCount(progress: GoalProgress): number {
  return goalTiersSet(progress).filter((tier) => progress[tier].met).length;
}

export function allGoalsMet(progress: GoalProgress): boolean {
  const set = goalTiersSet(progress);
  return set.length > 0 && set.every((tier) => progress[tier].met);
}

/** The next tier with an open goal, in Read → Review → Quiz order starting
 *  after the current one. */
export function nextOpenTier(progress: GoalProgress, current: GoalTier): GoalTier | null {
  const start = GOAL_TIERS.indexOf(current);
  for (let offset = 1; offset < GOAL_TIERS.length; offset++) {
    const tier = GOAL_TIERS[(start + offset) % GOAL_TIERS.length];
    if (progress[tier].goal !== null && !progress[tier].met) return tier;
  }
  return null;
}
