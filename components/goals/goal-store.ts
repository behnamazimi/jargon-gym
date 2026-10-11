"use client";

import { claimGoalCelebrationAction } from "@/app/(private)/app/goals/actions";
import { GOAL_TIERS, type DailyGoals, type GoalTier } from "@/lib/goals/levels";
import { EMPTY_GOAL_COUNTS, goalProgress, type GoalProgress } from "@/lib/goals/progress";
import type { GoalDay } from "@/lib/goals/settings";
import { localDateKey } from "@/lib/trace/local-day";

/** Live daily-goal tracking for the open tab. Study screens report each term
 *  they credit with tickGoal / goalCaughtUp; once a tier looks met, the
 *  server confirms it (it holds the real count and allows one celebration
 *  per tier a day) and the celebration opens. Until GoalsIsland seeds it,
 *  every call is a no-op. */

type GoalCelebration = {
  tier: GoalTier;
  progress: GoalProgress;
};

type State = {
  goals: DailyGoals | null;
  celebrate: boolean;
  timeZone: string;
  day: GoalDay;
  celebration: GoalCelebration | null;
};

const RETRY_MS = 2000;

let state: State | null = null;
const listeners = new Set<() => void>();
/** Terms credited in this tab since the last server count, per tier. */
const credited: Record<GoalTier, Set<string>> = {
  read: new Set(),
  review: new Set(),
  quiz: new Set(),
};
const claiming = new Set<GoalTier>();
/** The local total at the last claim, so a failed claim waits for new credit. */
const claimedAtTotal = new Map<GoalTier, number>();
const retryTimers = new Map<GoalTier, ReturnType<typeof setTimeout>>();

function emit() {
  for (const listener of listeners) listener();
}

function update(next: Partial<State>) {
  if (!state) return;
  state = { ...state, ...next };
  emit();
}

export function subscribeGoals(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getGoalsSnapshot(): State | null {
  return state;
}

export function seedGoals(seed: Omit<State, "celebration">) {
  if (state) return;
  state = { ...seed, celebration: null };
  emit();
}

/** The Goals page calls this so a change applies without a reload. Its
 *  day is fresh from the server, so this tab's own credits start over. */
export function setLiveGoals(next: { goals: DailyGoals | null; celebrate: boolean; day: GoalDay }) {
  for (const tier of GOAL_TIERS) credited[tier].clear();
  claimedAtTotal.clear();
  update(next);
}

export function closeGoalCelebration() {
  update({ celebration: null });
}

export function tickGoal(tier: GoalTier, termIds: string | readonly string[]) {
  if (!state) return;
  rollOverIfNewDay();
  for (const id of typeof termIds === "string" ? [termIds] : termIds) credited[tier].add(id);
  if (looksMet(tier) && localTotal(tier) > (claimedAtTotal.get(tier) ?? -1)) {
    void claim(tier, false, true);
  }
}

/** The tier has nothing left to serve today, which counts as its goal met
 *  once something was studied there today. */
export function goalCaughtUp(tier: GoalTier) {
  if (!state) return;
  rollOverIfNewDay();
  if (isOpen(tier) && localTotal(tier) > 0) void claim(tier, true, false);
}

function isOpen(tier: GoalTier): boolean {
  if (!state?.celebrate || !state.goals) return false;
  return state.goals[tier] !== null && !state.day.celebrated.includes(tier) && !claiming.has(tier);
}

function localTotal(tier: GoalTier): number {
  return (state?.day.counts[tier] ?? 0) + credited[tier].size;
}

function looksMet(tier: GoalTier): boolean {
  if (!state?.goals || !isOpen(tier)) return false;
  return localTotal(tier) >= (state.goals[tier] ?? Infinity);
}

function rollOverIfNewDay() {
  if (!state) return;
  const today = localDateKey(new Date(), state.timeZone);
  if (state.day.date === today) return;
  for (const tier of GOAL_TIERS) credited[tier].clear();
  claimedAtTotal.clear();
  state = {
    ...state,
    day: { date: today, counts: EMPTY_GOAL_COUNTS, celebrated: [] },
  };
}

async function claim(tier: GoalTier, caughtUp: boolean, mayRetry: boolean) {
  claiming.add(tier);
  claimedAtTotal.set(tier, localTotal(tier));
  clearTimeout(retryTimers.get(tier));
  const result = await claimGoalCelebrationAction(tier, caughtUp).catch(() => ({
    claimed: false,
    day: undefined,
  }));
  claiming.delete(tier);
  if (!state) return;

  if (result.day) {
    // The server count now includes everything it has received; keep only
    // credits it may not have yet (reads land a moment after the response).
    const serverDay = result.day;
    for (const t of GOAL_TIERS) {
      if (serverDay.counts[t] >= state.day.counts[t] + credited[t].size) credited[t].clear();
    }
    state = { ...state, day: serverDay };
  }

  if (result.claimed && state.goals) {
    const progress = goalProgress(state.goals, state.day.counts, state.day.celebrated);
    update({ celebration: { tier, progress } });
    return;
  }
  emit();

  if (mayRetry && looksMet(tier)) {
    retryTimers.set(
      tier,
      setTimeout(() => {
        if (looksMet(tier)) void claim(tier, false, false);
      }, RETRY_MS),
    );
  }
}
