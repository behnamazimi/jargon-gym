import { describe, expect, it } from "vitest";
import { allGoalsMet, goalProgress, metCount, nextOpenTier } from "./progress";

const goals = { read: 20, review: 10, quiz: null };

describe("goalProgress", () => {
  it("marks a tier met once its count reaches the goal", () => {
    const progress = goalProgress(goals, { read: 20, review: 4, quiz: 9 });
    expect(progress.read).toEqual({ goal: 20, done: 20, met: true });
    expect(progress.review.met).toBe(false);
    expect(progress.quiz).toEqual({ goal: null, done: 9, met: false });
  });

  it("counts a tier celebrated today as met, even below its goal", () => {
    expect(goalProgress(goals, { read: 3, review: 0, quiz: 0 }, ["read"]).read.met).toBe(true);
  });
});

describe("allGoalsMet and metCount", () => {
  it("only look at tiers with a goal", () => {
    const progress = goalProgress(goals, { read: 20, review: 10, quiz: 0 });
    expect(allGoalsMet(progress)).toBe(true);
    expect(metCount(progress)).toBe(2);
  });

  it("is never all met with no goals", () => {
    const progress = goalProgress(
      { read: null, review: null, quiz: null },
      { read: 5, review: 5, quiz: 5 },
    );
    expect(allGoalsMet(progress)).toBe(false);
  });
});

describe("nextOpenTier", () => {
  it("goes Read, Review, Quiz and wraps around", () => {
    const all = { read: 10, review: 10, quiz: 10 };
    const none = { read: 0, review: 0, quiz: 0 };
    expect(nextOpenTier(goalProgress(all, { ...none, read: 10 }), "read")).toBe("review");
    expect(nextOpenTier(goalProgress(all, { ...none, quiz: 10 }), "quiz")).toBe("read");
  });

  it("skips tiers that are off or done", () => {
    const progress = goalProgress(
      { read: 10, review: null, quiz: 5 },
      { read: 10, review: 0, quiz: 0 },
    );
    expect(nextOpenTier(progress, "read")).toBe("quiz");
  });

  it("is null when nothing is left", () => {
    const progress = goalProgress(goals, { read: 20, review: 10, quiz: 0 });
    expect(nextOpenTier(progress, "review")).toBeNull();
  });
});
