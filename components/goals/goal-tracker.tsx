"use client";

import { useMountEffect } from "@/hooks/use-mount-effect";
import type { DailyGoals } from "@/lib/goals/levels";
import type { GoalDay } from "@/lib/goals/settings";
import { GoalCelebrationDialog } from "./goal-celebration-dialog";
import { seedGoals } from "./goal-store";

export function GoalTracker(props: {
  goals: DailyGoals | null;
  celebrate: boolean;
  timeZone: string;
  day: GoalDay;
}) {
  useMountEffect(() => seedGoals(props));
  return <GoalCelebrationDialog />;
}
