"use client";

import { Minus, Plus } from "lucide-react";
import { GoalLobyaScene } from "@/components/illustrations/scenes/goal-team";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  GOAL_LEVEL_LABELS,
  GOAL_LEVELS,
  GOAL_TIER_LABELS,
  goalForLevel,
  nearestLevel,
  stepGoal,
  type GoalLevel,
  type GoalTier,
} from "@/lib/goals/levels";
import { cn } from "@/lib/utils";

const PER_DAY: Record<GoalTier, string> = {
  read: "terms a day",
  review: "cards a day",
  quiz: "questions a day",
};

const JOBS: Record<GoalTier, string> = {
  read: "Lobyar reads",
  review: "Lobyare reviews",
  quiz: "Lobyaq quizzes",
};

const surface = "shadow-surface rounded-box bg-base-100 ring-1 ring-base-content/5";

/** One lobya's card: its pace (which sets its pose) and a fine-tune stepper. */
export function TierCard({
  tier,
  goal,
  onChange,
}: {
  tier: GoalTier;
  goal: number | null;
  onChange: (goal: number | null) => void;
}) {
  const level = nearestLevel(tier, goal);
  const label = GOAL_TIER_LABELS[tier];

  return (
    <div className={cn(surface, "flex flex-col gap-3 p-4")}>
      <div className="flex items-center gap-3 md:flex-col md:text-center">
        <GoalLobyaScene tier={tier} level={level} className="w-24 shrink-0 md:w-32" />
        <div className="min-w-0 flex-1 md:w-full">
          <h3 className="m-0 text-base font-medium">{label}</h3>
          <p className="m-0 text-xs text-base-content/70">{JOBS[tier]}</p>
          <div className="mt-2 flex items-center gap-2 md:justify-center">
            <Button
              variant="outline"
              size="icon-sm"
              className="coarse:size-11"
              aria-label={`Fewer ${PER_DAY[tier]}`}
              isDisabled={goal === null}
              onPress={() => onChange(stepGoal(goal, -1))}
            >
              <Minus className="size-4" aria-hidden />
            </Button>
            <p className="m-0 min-w-16 text-center leading-tight" aria-live="polite">
              <span className="block text-xl font-semibold tabular-nums">{goal ?? "Off"}</span>
              <span className="block text-xs text-base-content/70">
                {goal ? PER_DAY[tier] : "no goal"}
              </span>
            </p>
            <Button
              variant="outline"
              size="icon-sm"
              className="coarse:size-11"
              aria-label={`More ${PER_DAY[tier]}`}
              onPress={() => onChange(stepGoal(goal, 1))}
            >
              <Plus className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      </div>
      <ToggleGroup
        aria-label={`${label} pace`}
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={[level]}
        onSelectionChange={(keys) => {
          const [key] = [...keys];
          if (key) onChange(goalForLevel(tier, key as GoalLevel));
        }}
        className="grid grid-cols-4 gap-1 md:grid-cols-2"
      >
        {GOAL_LEVELS.map((option) => (
          <ToggleGroupItem key={option} id={option} className="justify-center px-1">
            {GOAL_LEVEL_LABELS[option]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
