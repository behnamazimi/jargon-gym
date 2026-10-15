/** Goal forecast: plays TRACE forward one study day at a time, with the
 *  daily goals as each tier's budget, and reports when every term in a
 *  collection would reach Mastered. It only calls the same ranking and
 *  update functions the app uses, so it follows TRACE when they change.
 *  A term is graded at most once a simulated day, so the same-day rule and
 *  in-session retries never come up here; the one-day floor on a recalled term
 *  does carry through. See docs/goals.md. */

import { AGAIN, EASY, GOOD, HARD } from "./constants";
import { crossedThresholds } from "./mastery";
import { rankQuizQueue, rankReadQueue, rankReviewQueue } from "./queue";
import {
  applyQuizAnswer,
  applyReadEvent,
  applyReviewGrade,
  computeTraceSnapshot,
} from "./snapshot";
import type { ReviewGrade, TraceCandidate } from "./types";

export type ForecastBudget = { read: number; review: number; quiz: number };

export type ForecastRates = {
  /** Chance a Review grade is Hard, Good or Easy rather than Again. */
  reviewSuccess: number;
  /** How a successful grade splits between Hard, Good and Easy. */
  successMix: { hard: number; good: number; easy: number };
  /** Chance a Quiz answer is right. */
  quizSuccess: number;
};

export const DEFAULT_FORECAST_RATES: ForecastRates = {
  reviewSuccess: 0.85,
  successMix: { hard: 0.15, good: 0.75, easy: 0.1 },
  quizSuccess: 0.85,
};

const FORECAST_HORIZON_DAYS = 365;
export const FORECAST_SHORT_DAYS = 30;
const FORECAST_RUNS = 3;
/** A run stops once this many days pass with nothing newly mastered: the
 *  goals are too small for what's left, so it won't finish in the horizon. */
const STALL_DAYS = 90;
/** From this day on, a run also stops once every unfinished collection's
 *  recent pace puts it well past the horizon. Pace only slows as fewer new
 *  terms are left, so a linear guess that's already too late stays too late. */
const PACE_CHECK_FROM_DAY = 60;
const PACE_WINDOW_DAYS = 30;
const PACE_MARGIN = 1.25;
const DAY_MS = 24 * 60 * 60 * 1000;

type CollectionForecast = {
  collectionId: string;
  /** Days from today until the whole collection is mastered, earliest and
   *  latest across runs; null when it doesn't happen within the horizon. */
  lowDays: number | null;
  highDays: number | null;
  /** Terms in the collection not mastered yet. */
  remaining: number;
};

export type MasteryForecast =
  | { kind: "noGoals" }
  | { kind: "needsReview" }
  | {
      kind: "forecast";
      collections: CollectionForecast[];
      /** Terms newly mastered over the next FORECAST_SHORT_DAYS, averaged. */
      masteredSoon: number;
      /** Terms not mastered yet, so callers can tell when everything is. */
      remaining: number;
    };

/** Mastered needs Review (Read adds nothing to mastery and Quiz alone tops
 *  out below the known line), so a plan without it never gets a date. */
export function forecastMastery(
  candidates: TraceCandidate[],
  budget: ForecastBudget,
  rates: ForecastRates,
  now: Date,
): MasteryForecast {
  if (budget.read <= 0 && budget.review <= 0 && budget.quiz <= 0) return { kind: "noGoals" };
  if (budget.review <= 0) return { kind: "needsReview" };

  const pool = candidates.filter((c) => !c.markedKnownAt);
  const runs = Array.from({ length: FORECAST_RUNS }, (_, run) =>
    simulate(pool, budget, rates, now, run + 1),
  );

  const collectionIds = [...new Set(pool.map((c) => c.collectionId))];
  const collections = collectionIds.map((collectionId) => {
    const days = runs.map((run) => run.doneOnDay.get(collectionId) ?? null);
    const reached = days.filter((d): d is number => d !== null);
    return {
      collectionId,
      lowDays: reached.length > 0 ? Math.min(...reached) : null,
      highDays: reached.length === days.length ? Math.max(...reached) : null,
      remaining: pool.filter((c) => c.collectionId === collectionId && c.everMasteredAt === null)
        .length,
    };
  });

  const masteredSoon = Math.round(
    runs.reduce((sum, run) => sum + run.masteredSoon, 0) / runs.length,
  );
  const remaining = pool.filter((c) => c.everMasteredAt === null).length;
  return { kind: "forecast", collections, masteredSoon, remaining };
}

type RunResult = {
  doneOnDay: Map<string, number>;
  masteredSoon: number;
};

function simulate(
  pool: TraceCandidate[],
  budget: ForecastBudget,
  rates: ForecastRates,
  now: Date,
  seed: number,
): RunResult {
  const random = seededRandom(seed);
  const terms = pool.map((c) => ({ ...c }));
  const remaining = new Map<string, number>();
  for (const term of terms) {
    if (term.everMasteredAt === null) {
      remaining.set(term.collectionId, (remaining.get(term.collectionId) ?? 0) + 1);
    }
  }

  const doneOnDay = new Map<string, number>();
  const masteredByDay: Map<string, number>[] = [];
  for (const [collectionId, count] of countByCollection(terms)) {
    if (count > 0 && !remaining.get(collectionId)) doneOnDay.set(collectionId, 0);
  }

  let masteredSoon = 0;
  let lastMasteredDay = 0;
  const markMastered = (term: TraceCandidate, at: Date, day: number) => {
    if (term.everMasteredAt !== null) return;
    term.everMasteredAt = at;
    lastMasteredDay = day;
    if (day <= FORECAST_SHORT_DAYS) masteredSoon++;
    const left = (remaining.get(term.collectionId) ?? 0) - 1;
    remaining.set(term.collectionId, left);
    if (left === 0) doneOnDay.set(term.collectionId, day);
  };

  for (let day = 1; day <= FORECAST_HORIZON_DAYS; day++) {
    if (shouldStop(remaining, masteredByDay, budget, day, lastMasteredDay)) break;
    masteredByDay.push(new Map(remaining));
    const at = new Date(now.getTime() + day * DAY_MS);
    studyOneDay(terms, budget, rates, random, at, (term) => markMastered(term, at, day));
  }

  return { doneOnDay, masteredSoon };
}

/** One simulated day: each tier serves its budget of top-ranked terms. */
function studyOneDay(
  terms: TraceCandidate[],
  budget: ForecastBudget,
  rates: ForecastRates,
  random: () => number,
  at: Date,
  onMastered: (term: TraceCandidate) => void,
) {
  for (const term of rankReadQueue(terms, at).slice(0, budget.read)) {
    Object.assign(term, applyReadEvent(term, at));
  }

  for (const term of rankReviewQueue(terms, at).slice(0, budget.review)) {
    const grade = pickGrade(random, rates);
    Object.assign(term, applyReviewGrade(term, grade, at), {
      reviewRecallCount: term.reviewRecallCount + 1,
      lastReviewRecallAt: at,
    });
    if (crossedThresholds(computeTraceSnapshot(term, at).knownLabel, grade !== AGAIN).known) {
      onMastered(term);
    }
  }

  for (const term of rankQuizQueue(terms, at).slice(0, budget.quiz)) {
    const correct = random() < rates.quizSuccess;
    Object.assign(term, applyQuizAnswer(term, correct, "multiple_choice", at), {
      quizTestCount: term.quizTestCount + 1,
      lastQuizTestedAt: at,
    });
    if (crossedThresholds(computeTraceSnapshot(term, at).knownLabel, correct).known) {
      onMastered(term);
    }
  }
}

/** Ends a run early once no collection that's left can finish in time. */
function shouldStop(
  remaining: Map<string, number>,
  masteredByDay: Map<string, number>[],
  budget: ForecastBudget,
  day: number,
  lastMasteredDay: number,
): boolean {
  // Each term left needs at least one more good review or quiz answer.
  const testsLeft = (budget.review + budget.quiz) * (FORECAST_HORIZON_DAYS - day + 1);
  const reachable = [...remaining.values()].some((left) => left > 0 && left <= testsLeft);
  if (!reachable || day - lastMasteredDay > STALL_DAYS) return true;
  return day > PACE_CHECK_FROM_DAY && tooSlowForHorizon(remaining, masteredByDay, day);
}

/** True when no unfinished collection could finish inside the horizon at
 *  the pace it kept over the last PACE_WINDOW_DAYS. */
function tooSlowForHorizon(
  remaining: Map<string, number>,
  masteredByDay: Map<string, number>[],
  day: number,
): boolean {
  const before = masteredByDay[day - 1 - PACE_WINDOW_DAYS];
  if (!before) return false;
  for (const [collectionId, left] of remaining) {
    if (left <= 0) continue;
    const perDay = ((before.get(collectionId) ?? left) - left) / PACE_WINDOW_DAYS;
    if (perDay <= 0) continue;
    if (day + left / perDay <= FORECAST_HORIZON_DAYS * PACE_MARGIN) return false;
  }
  return true;
}

function pickGrade(random: () => number, rates: ForecastRates): ReviewGrade {
  if (random() >= rates.reviewSuccess) return AGAIN;
  const { hard, good, easy } = rates.successMix;
  const roll = random() * (hard + good + easy);
  if (roll < hard) return HARD;
  if (roll < hard + good) return GOOD;
  return EASY;
}

function countByCollection(terms: TraceCandidate[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const term of terms) counts.set(term.collectionId, (counts.get(term.collectionId) ?? 0) + 1);
  return counts;
}

/** mulberry32: small, fast and the same sequence for the same seed. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
