import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TraceState } from "@/lib/trace";

const { fetchTraceStateForUser, recordTraceEventForUser } = vi.hoisted(() => ({
  fetchTraceStateForUser: vi.fn(),
  recordTraceEventForUser: vi.fn(),
}));

vi.mock("@/lib/trace-queue/repository", () => ({
  fetchTraceState: vi.fn(),
  fetchTraceStateForUser,
  recordTraceEvent: vi.fn(),
  recordTraceEventForUser,
  bumpStreak: vi.fn(),
  bumpStreakForUser: vi.fn().mockResolvedValue(undefined),
}));

import { applyQuizAnswer, applyReviewGrade } from "./review-outcome";

const NOW = new Date("2026-03-01T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const client = {} as never;

/** A term that is well tested and strong on both tracks, so a success right now
 *  lands above the known threshold. */
function strongState(): TraceState {
  return {
    readCount: 3,
    lastReadAt: new Date(NOW.getTime() - 2 * DAY),
    recallStability: 50,
    recallDifficulty: 4,
    reviewRecallCount: 3,
    lastReviewRecallAt: new Date(NOW.getTime() - 1 * DAY),
    quizKnowledgePosterior: 0.99,
    quizTestCount: 2,
    lastQuizTestedAt: new Date(NOW.getTime() - 0.5 * DAY),
  };
}

function lastPayload() {
  return recordTraceEventForUser.mock.calls.at(-1)![4];
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  fetchTraceStateForUser.mockResolvedValue(strongState());
  recordTraceEventForUser.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("applyReviewGrade stamps", () => {
  it("stamps both marks on a Good grade for a strong term", async () => {
    await applyReviewGrade(client, "u1", { termId: "t1", grade: 3, mode: "admin" });
    expect(lastPayload()).toMatchObject({
      crossedKnownThreshold: true,
      crossedLearningThreshold: true,
    });
  });

  it("stamps on Hard, since the term was recalled", async () => {
    await applyReviewGrade(client, "u1", { termId: "t1", grade: 2, mode: "admin" });
    expect(lastPayload()).toMatchObject({ crossedKnownThreshold: true });
  });

  it("never stamps on Again", async () => {
    await applyReviewGrade(client, "u1", { termId: "t1", grade: 1, mode: "admin" });
    expect(lastPayload()).toMatchObject({
      crossedKnownThreshold: false,
      crossedLearningThreshold: false,
    });
  });
});

describe("applyQuizAnswer stamps", () => {
  it("stamps on a correct answer for a strong term", async () => {
    await applyQuizAnswer(client, "u1", {
      termId: "t1",
      passed: true,
      questionType: "multiple_choice",
      mode: "admin",
    });
    expect(lastPayload()).toMatchObject({
      crossedKnownThreshold: true,
      crossedLearningThreshold: true,
    });
  });

  it("never stamps on a missed answer", async () => {
    await applyQuizAnswer(client, "u1", {
      termId: "t1",
      passed: false,
      questionType: "multiple_choice",
      mode: "admin",
    });
    expect(lastPayload()).toMatchObject({
      crossedKnownThreshold: false,
      crossedLearningThreshold: false,
    });
  });
});
