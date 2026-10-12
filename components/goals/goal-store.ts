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

const RETRY_MS = 1500;
const MAX_RETRIES = 3;

let state: State | null = null;
const listeners = new Set<() => void>();
const emptySets = (): Record<GoalTier, Set<string>> => ({
  read: new Set(),
  review: new Set(),
  quiz: new Set(),
});
/** Every term this tab credited today, so a term counts once here. */
const seen = emptySets();
/** Credited terms the server hadn't counted at its last answer. */
const credited = emptySets();
const claiming = new Set<GoalTier>();
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

/** Forgets everything, so the next account to sign in on this tab starts clean. */
export function resetGoals() {
  state = null;
  clearCredits();
  claiming.clear();
  emit();
}

function clearCredits() {
  for (const tier of GOAL_TIERS) {
    seen[tier].clear();
    credited[tier].clear();
    clearTimeout(retryTimers.get(tier));
  }
  retryTimers.clear();
}

/** The Goals page calls this so a change applies without a reload. Its
 *  day is fresh from the server, so this tab's own credits start over. */
export function setLiveGoals(next: { goals: DailyGoals | null; celebrate: boolean; day: GoalDay }) {
  clearCredits();
  update(next);
}

export function closeGoalCelebration() {
  update({ celebration: null });
}

export function tickGoal(tier: GoalTier, termIds: string | readonly string[]) {
  if (!state) return;
  rollOverIfNewDay();
  for (const id of typeof termIds === "string" ? [termIds] : termIds) {
    if (seen[tier].has(id)) continue;
    seen[tier].add(id);
    credited[tier].add(id);
  }
  if (looksMet(tier)) void claim(tier, false, MAX_RETRIES);
}

/** The tier has nothing left to serve today, which counts as its goal met
 *  once something was studied there today. */
export function goalCaughtUp(tier: GoalTier) {
  if (!state) return;
  rollOverIfNewDay();
  if (isOpen(tier) && localTotal(tier) > 0) void claim(tier, true, 0);
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
  clearCredits();
  state = {
    ...state,
    day: { date: today, counts: EMPTY_GOAL_COUNTS, celebrated: [] },
  };
}

async function claim(tier: GoalTier, caughtUp: boolean, retriesLeft: number) {
  claiming.add(tier);
  clearTimeout(retryTimers.get(tier));
  const sent = GOAL_TIERS.map((t) => [t, [...credited[t]]] as const);
  const result = await claimGoalCelebrationAction(tier, caughtUp).catch(() => ({
    claimed: false,
    day: undefined,
  }));
  claiming.delete(tier);
  if (!state) return;

  if (result.day) {
    // The server's count is the truth from here on. Credits sent with this
    // claim are dropped (they're counted, or were already counted before
    // this tab saw them); only terms credited while it was in flight stay.
    for (const [t, ids] of sent) for (const id of ids) credited[t].delete(id);
    state = { ...state, day: result.day };
  }

  if (result.claimed && state.goals) {
    const progress = goalProgress(state.goals, state.day.counts, state.day.celebrated);
    update({ celebration: { tier, progress } });
    return;
  }
  emit();

  // A read is written just after its response, so the server may simply be
  // behind: ask again a few times, then wait for the next credit.
  if (retriesLeft > 0 && isOpen(tier)) {
    retryTimers.set(
      tier,
      setTimeout(() => {
        if (isOpen(tier)) void claim(tier, false, retriesLeft - 1);
      }, RETRY_MS),
    );
  }
}
