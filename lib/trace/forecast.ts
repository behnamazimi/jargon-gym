/** Goal forecast: plays TRACE forward one study day at a time, with the
 *  daily goals as each tier's budget, and reports when every term in a
 *  collection would reach Mastered. It only calls the same ranking and
 *  update functions the app uses, so it follows TRACE when they change.
 *  See docs/goals.md. */

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
  | { kind: "needsReviewAndQuiz"; missing: ("review" | "quiz")[] }
  | {
      kind: "forecast";
      collections: CollectionForecast[];
      /** Terms newly mastered over the next FORECAST_SHORT_DAYS, averaged. */
      masteredSoon: number;
      /** Terms not mastered yet, so callers can tell when everything is. */
      remaining: number;
    };

/** Mastered needs Review and Quiz both (Read alone tops out far below the
 *  known line), so a plan without one of them never gets a date. */
export function forecastMastery(
  candidates: TraceCandidate[],
  budget: ForecastBudget,
  rates: ForecastRates,
  now: Date,
): MasteryForecast {
  if (budget.read <= 0 && budget.review <= 0 && budget.quiz <= 0) return { kind: "noGoals" };
  const missing = (["review", "quiz"] as const).filter((tier) => budget[tier] <= 0);
  if (missing.length > 0) return { kind: "needsReviewAndQuiz", missing };

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
  for (const [collectionId, count] of countByCollection(terms)) {
    if (count > 0 && !remaining.get(collectionId)) doneOnDay.set(collectionId, 0);
  }

  let masteredSoon = 0;
  const markMastered = (term: TraceCandidate, at: Date, day: number) => {
    if (term.everMasteredAt !== null) return;
    term.everMasteredAt = at;
    if (day <= FORECAST_SHORT_DAYS) masteredSoon++;
    const left = (remaining.get(term.collectionId) ?? 0) - 1;
    remaining.set(term.collectionId, left);
    if (left === 0) doneOnDay.set(term.collectionId, day);
  };

  for (let day = 1; day <= FORECAST_HORIZON_DAYS; day++) {
    if ([...remaining.values()].every((left) => left <= 0)) break;
    const at = new Date(now.getTime() + day * DAY_MS);

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
        markMastered(term, at, day);
      }
    }

    for (const term of rankQuizQueue(terms, at).slice(0, budget.quiz)) {
      const correct = random() < rates.quizSuccess;
      Object.assign(term, applyQuizAnswer(term, correct, "multiple_choice", at), {
        quizTestCount: term.quizTestCount + 1,
        lastQuizTestedAt: at,
      });
      if (crossedThresholds(computeTraceSnapshot(term, at).knownLabel, correct).known) {
        markMastered(term, at, day);
      }
    }
  }

  return { doneOnDay, masteredSoon };
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
