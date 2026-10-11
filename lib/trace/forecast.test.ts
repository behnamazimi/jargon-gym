import { describe, expect, it } from "vitest";
import { DEFAULT_FORECAST_RATES, forecastMastery, type MasteryForecast } from "./forecast";
import type { TraceCandidate } from "./types";

const NOW = new Date("2026-10-11T08:00:00Z");

function term(index: number, collectionId: string, extra: Partial<TraceCandidate> = {}) {
  return {
    termId: `${collectionId}-${index}`,
    collectionId,
    createdAt: new Date(NOW.getTime() - (1000 - index) * 60_000),
    readCount: 0,
    lastReadAt: null,
    recallStability: null,
    recallDifficulty: null,
    reviewRecallCount: 0,
    lastReviewRecallAt: null,
    quizKnowledgePosterior: null,
    quizTestCount: 0,
    lastQuizTestedAt: null,
    everMasteredAt: null,
    everLearningAt: null,
    markedKnownAt: null,
    ...extra,
  } satisfies TraceCandidate;
}

function collection(id: string, size: number): TraceCandidate[] {
  return Array.from({ length: size }, (_, i) => term(i, id));
}

function forecastOf(result: MasteryForecast) {
  if (result.kind !== "forecast") throw new Error(`expected a forecast, got ${result.kind}`);
  return result;
}

const STEADY = { read: 20, review: 20, quiz: 10 };

describe("forecastMastery", () => {
  it("has nothing to say with every tier off", () => {
    expect(
      forecastMastery(
        collection("a", 5),
        { read: 0, review: 0, quiz: 0 },
        DEFAULT_FORECAST_RATES,
        NOW,
      ),
    ).toEqual({ kind: "noGoals" });
  });

  it("asks for Review and Quiz when either is off", () => {
    expect(
      forecastMastery(
        collection("a", 5),
        { read: 20, review: 0, quiz: 0 },
        DEFAULT_FORECAST_RATES,
        NOW,
      ),
    ).toEqual({ kind: "needsReviewAndQuiz", missing: ["review", "quiz"] });
    expect(
      forecastMastery(
        collection("a", 5),
        { read: 0, review: 10, quiz: 0 },
        DEFAULT_FORECAST_RATES,
        NOW,
      ),
    ).toEqual({ kind: "needsReviewAndQuiz", missing: ["quiz"] });
  });

  it("predicts a small collection gets mastered", () => {
    const result = forecastOf(
      forecastMastery(collection("a", 30), STEADY, DEFAULT_FORECAST_RATES, NOW),
    );
    const [only] = result.collections;
    expect(only.collectionId).toBe("a");
    expect(only.lowDays).not.toBeNull();
    expect(only.highDays).not.toBeNull();
    expect(only.lowDays!).toBeLessThanOrEqual(only.highDays!);
    expect(result.masteredSoon).toBeGreaterThan(0);
  });

  it("gets there sooner with bigger goals", () => {
    const pool = collection("a", 150);
    const light = forecastOf(
      forecastMastery(pool, { read: 10, review: 10, quiz: 5 }, DEFAULT_FORECAST_RATES, NOW),
    );
    const intense = forecastOf(
      forecastMastery(pool, { read: 40, review: 40, quiz: 20 }, DEFAULT_FORECAST_RATES, NOW),
    );
    expect(intense.masteredSoon).toBeGreaterThan(light.masteredSoon);
    expect(intense.collections[0].highDays!).toBeLessThan(light.collections[0].lowDays ?? Infinity);
  });

  it("gives the same answer for the same input", () => {
    const pool = collection("a", 40);
    expect(forecastMastery(pool, STEADY, DEFAULT_FORECAST_RATES, NOW)).toEqual(
      forecastMastery(pool, STEADY, DEFAULT_FORECAST_RATES, NOW),
    );
  });

  it("counts a collection that is already mastered as done today", () => {
    const pool = Array.from({ length: 3 }, (_, i) => term(i, "done", { everMasteredAt: NOW }));
    const result = forecastOf(forecastMastery(pool, STEADY, DEFAULT_FORECAST_RATES, NOW));
    expect(result.collections).toEqual([
      { collectionId: "done", lowDays: 0, highDays: 0, remaining: 0 },
    ]);
    expect(result.masteredSoon).toBe(0);
    expect(result.remaining).toBe(0);
  });

  it("leaves out terms marked known", () => {
    const pool = [term(0, "a", { markedKnownAt: NOW }), term(1, "b")];
    const result = forecastOf(forecastMastery(pool, STEADY, DEFAULT_FORECAST_RATES, NOW));
    expect(result.collections.map((c) => c.collectionId)).toEqual(["b"]);
  });

  it("has no date when a collection can't finish within a year", () => {
    const result = forecastOf(
      forecastMastery(
        collection("big", 800),
        { read: 0, review: 2, quiz: 2 },
        DEFAULT_FORECAST_RATES,
        NOW,
      ),
    );
    expect(result.collections[0]).toMatchObject({ lowDays: null, highDays: null });
  });
});
