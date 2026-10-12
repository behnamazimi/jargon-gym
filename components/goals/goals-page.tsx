"use client";

import { useRef, useState, useTransition } from "react";
import {
  forecastGoalsAction,
  saveGoalsAction,
  setGoalCelebrateAction,
} from "@/app/(private)/app/goals/actions";
import { OptionRow } from "@/components/read/read-option-row";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useMountEffect } from "@/hooks/use-mount-effect";
import type { GoalForecast } from "@/lib/goals/forecast";
import { DEFAULT_GOALS, GOAL_TIERS, type DailyGoals, type GoalTier } from "@/lib/goals/levels";
import type { GoalDay, GoalSettings } from "@/lib/goals/settings";
import { cn } from "@/lib/utils";
import { setLiveGoals } from "./goal-store";
import { ForecastPanel } from "./goal-forecast-panel";
import { TierCard } from "./goal-tier-card";
import { IntroPanel, TodayPanel } from "./goal-today-panel";

const FORECAST_DEBOUNCE_MS = 400;

const surface = "shadow-surface rounded-box bg-base-100 ring-1 ring-base-content/5";

export function GoalsPage({ settings, day }: { settings: GoalSettings; day: GoalDay }) {
  const { toast } = useToast();
  const [saved, setSaved] = useState(settings.goals);
  const [draft, setDraft] = useState<DailyGoals>(settings.goals ?? DEFAULT_GOALS);
  const [celebrate, setCelebrate] = useState(settings.celebrate);
  const [forecast, setForecast] = useState<GoalForecast | null>(null);
  const [isForecasting, setIsForecasting] = useState(true);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRequest = useRef(0);

  const dirty = saved === null || GOAL_TIERS.some((tier) => saved[tier] !== draft[tier]);

  async function loadForecast(goals: DailyGoals) {
    const request = ++latestRequest.current;
    setIsForecasting(true);
    const result = await forecastGoalsAction(goals);
    if (request !== latestRequest.current) return;
    setIsForecasting(false);
    setForecastError(result.error ?? null);
    if (result.forecast) setForecast(result.forecast);
  }

  useMountEffect(() => {
    void loadForecast(draft);
  });

  function change(tier: GoalTier, goal: number | null) {
    const next = { ...draft, [tier]: goal };
    setDraft(next);
    setIsForecasting(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void loadForecast(next), FORECAST_DEBOUNCE_MS);
  }

  function save() {
    startSaving(async () => {
      const result = await saveGoalsAction(draft);
      if (result.error) {
        toast(result.error, "destructive");
        return;
      }
      setSaved(draft);
      setLiveGoals({ goals: draft, celebrate, day: result.day ?? day });
      toast("Goals saved");
    });
  }

  async function toggleCelebrate(next: boolean) {
    setCelebrate(next);
    const result = await setGoalCelebrateAction(next);
    if (result.error) {
      setCelebrate(!next);
      toast(result.error, "destructive");
      return;
    }
    if (saved) setLiveGoals({ goals: saved, celebrate: next, day });
  }

  return (
    <div className="space-y-6 max-md:space-y-4">
      {saved ? <TodayPanel goals={saved} day={day} /> : <IntroPanel />}

      <section aria-labelledby="goals-team-heading" className="space-y-3">
        <div>
          <h2 id="goals-team-heading" className="text-base font-medium">
            Your lobya team
          </h2>
          <p className="m-0 text-sm text-base-content/70">
            Pick how hard each one works every day.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {GOAL_TIERS.map((tier) => (
            <TierCard key={tier} tier={tier} goal={draft[tier]} onChange={(g) => change(tier, g)} />
          ))}
        </div>
      </section>

      <ForecastPanel forecast={forecast} isLoading={isForecasting} error={forecastError} />

      <ul className={cn(surface, "list-none p-0")}>
        <OptionRow
          id="goal-celebrate"
          label="Celebrate when I hit a goal"
          description="A short celebration the moment a day's goal is done."
          checked={celebrate}
          onChange={(next) => void toggleCelebrate(next)}
        />
      </ul>

      <div
        className={cn(
          "md:flex md:justify-end",
          dirty && "max-md:sticky max-md:bottom-4 max-md:z-10",
        )}
      >
        <Button
          className="min-h-11 w-full shadow-md md:w-auto md:shadow-none"
          isDisabled={!dirty || isSaving}
          onPress={save}
        >
          {isSaving ? "Saving…" : saved ? "Save goals" : "Start these goals"}
        </Button>
      </div>
    </div>
  );
}
