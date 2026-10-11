import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveReviewCollectionIds } from "@/lib/mastery/known-state";
import { fetchGradeDistribution } from "@/lib/mastery/collection-mastery-snapshot";
import type { Database } from "@/lib/supabase/database.types";
import {
  AGAIN,
  DEFAULT_FORECAST_RATES,
  EASY,
  forecastMastery,
  GOOD,
  HARD,
  type ForecastRates,
  type MasteryForecast,
} from "@/lib/trace";
import { fetchActiveTraceCandidates } from "@/lib/trace-queue/pool-stats";
import type { DailyGoals } from "./levels";

type Client = SupabaseClient<Database>;

/** Below this many quiz answers the default rate is a better guess. */
const MIN_QUIZ_ANSWERS_FOR_RATE = 10;

export type GoalForecast =
  | Exclude<MasteryForecast, { kind: "forecast" }>
  | { kind: "noCollections" }
  | {
      kind: "forecast";
      collections: {
        id: string;
        name: string;
        lowDays: number | null;
        highDays: number | null;
        remaining: number;
      }[];
      masteredSoon: number;
      remaining: number;
    };

export async function loadGoalForecast(
  client: Client,
  userId: string,
  goals: DailyGoals,
): Promise<GoalForecast> {
  const [{ collectionRows, reviewCollectionIds }, candidates, rates] = await Promise.all([
    resolveReviewCollectionIds(client, userId),
    fetchActiveTraceCandidates(client, userId),
    loadForecastRates(client),
  ]);

  const active = collectionRows.filter((row) => reviewCollectionIds.includes(row.id));
  if (active.length === 0) return { kind: "noCollections" };

  const result = forecastMastery(
    candidates,
    { read: goals.read ?? 0, review: goals.review ?? 0, quiz: goals.quiz ?? 0 },
    rates,
    new Date(),
  );
  if (result.kind !== "forecast") return result;

  const byId = new Map(result.collections.map((c) => [c.collectionId, c]));
  return {
    kind: "forecast",
    masteredSoon: result.masteredSoon,
    remaining: result.remaining,
    collections: active.flatMap((row) => {
      const forecast = byId.get(row.id);
      return forecast
        ? [
            {
              id: row.id,
              name: row.name,
              lowDays: forecast.lowDays,
              highDays: forecast.highDays,
              remaining: forecast.remaining,
            },
          ]
        : [];
    }),
  };
}

async function loadForecastRates(client: Client): Promise<ForecastRates> {
  const [grades, quiz] = await Promise.all([
    fetchGradeDistribution(client),
    client.rpc("my_quiz_answer_counts").then(({ data, error }) => {
      if (error) throw error;
      return data?.[0] ?? { passed: 0, total: 0 };
    }),
  ]);

  const rates = { ...DEFAULT_FORECAST_RATES };
  if (grades) {
    const { counts, total } = grades;
    const succeeded = counts[HARD] + counts[GOOD] + counts[EASY];
    rates.reviewSuccess = 1 - counts[AGAIN] / total;
    if (succeeded > 0) {
      rates.successMix = {
        hard: counts[HARD] / succeeded,
        good: counts[GOOD] / succeeded,
        easy: counts[EASY] / succeeded,
      };
    }
  }
  if (quiz.total >= MIN_QUIZ_ANSWERS_FOR_RATE) rates.quizSuccess = quiz.passed / quiz.total;
  return rates;
}
