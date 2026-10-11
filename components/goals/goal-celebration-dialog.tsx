"use client";

import { useSyncExternalStore } from "react";
import { GoalCheerScene } from "@/components/illustrations/scenes/goal-cheer";
import { Button, LinkButton } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  GOAL_TIER_HREFS,
  GOAL_TIER_LABELS,
  GOAL_TIER_UNITS,
  type GoalTier,
} from "@/lib/goals/levels";
import { allGoalsMet, nextOpenTier } from "@/lib/goals/progress";
import { closeGoalCelebration, getGoalsSnapshot, subscribeGoals } from "./goal-store";

const KEEP_LABELS: Record<GoalTier, string> = {
  read: "Keep reading",
  review: "Keep reviewing",
  quiz: "Keep quizzing",
};

export function GoalCelebrationDialog() {
  const celebration = useSyncExternalStore(
    subscribeGoals,
    () => getGoalsSnapshot()?.celebration ?? null,
    () => null,
  );
  if (!celebration) return null;

  const { tier, progress } = celebration;
  const all = allGoalsMet(progress);
  const next = nextOpenTier(progress, tier);
  const { done } = progress[tier];
  const unit = done === 1 ? GOAL_TIER_UNITS[tier].one : GOAL_TIER_UNITS[tier].many;

  return (
    <Dialog
      isOpen
      onOpenChange={(open) => {
        if (!open) closeGoalCelebration();
      }}
      className="max-w-sm"
    >
      <GoalCheerScene lead={tier} all={all} className="mx-auto -mb-2 w-full max-w-72" />
      <DialogHeader className="px-6 text-center">
        <DialogTitle className="font-heading text-2xl font-medium">
          {all ? "Today's goals done!" : `${GOAL_TIER_LABELS[tier]} goal done!`}
        </DialogTitle>
        <DialogDescription>
          {all
            ? "Every goal you set is done for today. Want to keep going?"
            : `${done} ${unit} today. Want to keep going?`}
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        {all ? (
          <>
            <Button className="min-h-11" autoFocus onPress={closeGoalCelebration}>
              Keep going
            </Button>
            <Button variant="ghost" className="min-h-11" onPress={closeGoalCelebration}>
              Done for today
            </Button>
          </>
        ) : (
          <>
            {next ? (
              <LinkButton
                href={GOAL_TIER_HREFS[next]}
                className="min-h-11"
                autoFocus
                onPress={closeGoalCelebration}
              >
                Go to {GOAL_TIER_LABELS[next]}
                <span className="font-normal tabular-nums opacity-80">
                  · {progress[next].done}/{progress[next].goal}
                </span>
              </LinkButton>
            ) : null}
            <Button
              variant={next ? "ghost" : "default"}
              className="min-h-11"
              autoFocus={!next}
              onPress={closeGoalCelebration}
            >
              {KEEP_LABELS[tier]}
            </Button>
          </>
        )}
      </div>
    </Dialog>
  );
}
