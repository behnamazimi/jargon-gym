export const GOAL_TIERS = ["read", "review", "quiz"] as const;
export type GoalTier = (typeof GOAL_TIERS)[number];

/** Distinct terms a day per tier; null means the tier has no goal. */
export type DailyGoals = Record<GoalTier, number | null>;

export const GOAL_LEVELS = ["off", "light", "steady", "intense"] as const;
export type GoalLevel = (typeof GOAL_LEVELS)[number];

type ActiveLevel = Exclude<GoalLevel, "off">;

const GOAL_PRESETS: Record<GoalTier, Record<ActiveLevel, number>> = {
  read: { light: 10, steady: 20, intense: 40 },
  review: { light: 10, steady: 20, intense: 40 },
  quiz: { light: 5, steady: 10, intense: 20 },
};

export const DEFAULT_GOALS: DailyGoals = {
  read: GOAL_PRESETS.read.steady,
  review: GOAL_PRESETS.review.steady,
  quiz: GOAL_PRESETS.quiz.steady,
};

const GOAL_STEP = 5;
const GOAL_MAX = 200;

export const GOAL_LEVEL_LABELS: Record<GoalLevel, string> = {
  off: "Off",
  light: "Light",
  steady: "Steady",
  intense: "Intense",
};

export const GOAL_TIER_LABELS: Record<GoalTier, string> = {
  read: "Read",
  review: "Review",
  quiz: "Quiz",
};

export const GOAL_TIER_HREFS: Record<GoalTier, string> = {
  read: "/app/read",
  review: "/app/review",
  quiz: "/app/quiz",
};

/** What one unit of a tier's goal is, for "20 terms a day" style lines. */
export const GOAL_TIER_UNITS: Record<GoalTier, { one: string; many: string }> = {
  read: { one: "term read", many: "terms read" },
  review: { one: "card graded", many: "cards graded" },
  quiz: { one: "question answered", many: "questions answered" },
};

export function goalForLevel(tier: GoalTier, level: GoalLevel): number | null {
  return level === "off" ? null : GOAL_PRESETS[tier][level];
}

/** The preset closest to a number, so a fine-tuned goal still picks a pose. */
export function nearestLevel(tier: GoalTier, goal: number | null): GoalLevel {
  if (goal === null || goal <= 0) return "off";
  const presets = GOAL_PRESETS[tier];
  let best: ActiveLevel = "light";
  for (const level of ["light", "steady", "intense"] as const) {
    if (Math.abs(presets[level] - goal) < Math.abs(presets[best] - goal)) best = level;
  }
  return best;
}

/** One ± press. Stepping down from the smallest goal turns the tier off,
 *  and stepping up from off starts at the smallest goal. */
export function stepGoal(goal: number | null, direction: 1 | -1): number | null {
  if (goal === null) return direction === 1 ? GOAL_STEP : null;
  const next = Math.round(goal / GOAL_STEP) * GOAL_STEP + direction * GOAL_STEP;
  if (next < GOAL_STEP) return null;
  return Math.min(next, GOAL_MAX);
}

/** Keeps only whole numbers in range; anything else is off. */
export function parseDailyGoals(value: unknown): DailyGoals | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const goals = {} as DailyGoals;
  for (const tier of GOAL_TIERS) {
    const raw = record[tier];
    goals[tier] =
      typeof raw === "number" && Number.isInteger(raw) && raw > 0 && raw <= GOAL_MAX ? raw : null;
  }
  return goals;
}
