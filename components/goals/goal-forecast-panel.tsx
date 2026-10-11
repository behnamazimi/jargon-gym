"use client";

import { Flag } from "lucide-react";
import type { GoalForecast } from "@/lib/goals/forecast";
import { FORECAST_SHORT_DAYS } from "@/lib/trace";
import { cn, pluralize } from "@/lib/utils";

const DAY_MS = 24 * 60 * 60 * 1000;

function dayLabel(days: number): string {
  return new Date(Date.now() + days * DAY_MS).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/** When a collection is done. The later end of the range, so it's a date
 *  the learner can count on rather than a best case. */
function finishLabel(lowDays: number | null, highDays: number | null): string {
  if (lowDays === 0 && highDays === 0) return "Done";
  if (lowDays === null) return "Over a year";
  if (highDays === null) return `${dayLabel(lowDays)} or later`;
  return `By ${dayLabel(highDays)}`;
}

function message(forecast: GoalForecast): string | null {
  switch (forecast.kind) {
    case "noGoals":
      return "Set a goal to see a forecast.";
    case "noCollections":
      return "Add a collection to see when you'd master it.";
    case "needsReviewAndQuiz": {
      const missing = forecast.missing.map((tier) => (tier === "review" ? "Review" : "Quiz"));
      return `Mastered takes both Review and Quiz. Turn on ${missing.join(" and ")} to see when you'll get there.`;
    }
    case "forecast":
      return null;
  }
}

export function ForecastPanel({
  forecast,
  isLoading,
  error,
}: {
  forecast: GoalForecast | null;
  isLoading: boolean;
  error: string | null;
}) {
  const note = forecast ? message(forecast) : null;

  return (
    <section
      aria-labelledby="goals-forecast-heading"
      aria-busy={isLoading}
      className="shadow-surface space-y-3 rounded-box bg-base-100 p-4 ring-1 ring-base-content/5 sm:p-5"
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Flag className="size-4 text-primary" aria-hidden />
          <h2 id="goals-forecast-heading" className="m-0 text-base font-medium">
            Where these goals take you
          </h2>
        </div>
        <p className="m-0 text-sm text-base-content/70">
          If you hit them every day, this is roughly when each collection is fully mastered.
        </p>
      </div>

      {error && !isLoading ? (
        <p className="m-0 text-sm text-error-text">{error}</p>
      ) : forecast === null ? (
        <ForecastSkeleton />
      ) : note ? (
        <p className="m-0 text-sm text-base-content/70">{note}</p>
      ) : forecast.kind === "forecast" ? (
        <div className={cn("space-y-3 transition-opacity", isLoading && "opacity-60")}>
          <ul className="m-0 list-none space-y-2 p-0">
            {forecast.collections.map((collection) => (
              <li
                key={collection.id}
                className="flex items-center justify-between gap-3 rounded-field bg-base-200/60 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="m-0 truncate text-sm font-medium">{collection.name}</p>
                  <p className="m-0 text-xs text-base-content/70 tabular-nums">
                    {collection.remaining === 0
                      ? "Every term mastered"
                      : `${pluralize(collection.remaining, "term")} to go`}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-medium tabular-nums">
                  {finishLabel(collection.lowDays, collection.highDays)}
                </span>
              </li>
            ))}
          </ul>
          <SummaryLine forecast={forecast} />
          <p className="m-0 text-xs text-base-content/70">
            An estimate from your goals and how your answers usually go. It updates as you change
            your goals.
          </p>
        </div>
      ) : null}
    </section>
  );
}

/** How many terms the next month brings, when that's less than all of them. */
function SummaryLine({ forecast }: { forecast: Extract<GoalForecast, { kind: "forecast" }> }) {
  const { masteredSoon, remaining } = forecast;
  if (remaining === 0 || masteredSoon >= remaining) return null;

  return (
    <p className="m-0 text-sm text-base-content/70">
      In the next {FORECAST_SHORT_DAYS} days, about{" "}
      <span className="font-semibold text-base-content tabular-nums">
        {pluralize(masteredSoon, "term")}
      </span>{" "}
      reach Mastered.
    </p>
  );
}

function ForecastSkeleton() {
  return (
    <div className="space-y-2" aria-hidden>
      <div className="h-10 animate-pulse rounded-field bg-base-200/60" />
      <div className="h-4 w-2/3 animate-pulse rounded bg-base-200/60" />
    </div>
  );
}
