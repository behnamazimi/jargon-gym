import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  access: { kind: "own", provider: "google", apiKey: "k" } as Record<string, unknown>,
  guardBusy: false,
  guardCalls: [] as unknown[],
  meteredOutcome: { charged: true, value: ["q"], remaining: 5 } as Record<string, unknown>,
  meteredCalls: 0,
  meteredCosts: [] as number[],
  slotCount: 1,
  generate: vi.fn(),
}));

vi.mock("@/lib/auth/require-session", () => ({
  requireAuthenticatedClient: async () => ({ supabase: {}, user: { id: "u1" } }),
}));
vi.mock("@/lib/consent/server", () => ({ hasAnalyticsConsent: async () => false }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/quiz/terms", () => ({ fetchQuizTermPool: async () => [{ id: "t1" }] }));
vi.mock("@/lib/quiz/generate", () => ({ generateQuizQuestions: state.generate }));
vi.mock("@/lib/quiz/distractors-supabase", () => ({ supabaseDistractorSource: () => ({}) }));
vi.mock("@/lib/quiz/plan-ai", () => ({
  planAiQuiz: async (terms: unknown[]) => ({
    terms,
    built: new Map(),
    slots: Array.from({ length: state.slotCount }, () => ({})),
  }),
}));
vi.mock("@/lib/llm/access", () => ({
  resolveAiAccess: async () => state.access,
  getAiAccessView: async () => ({}),
}));
vi.mock("@/lib/ai/run-guard", () => ({
  withRunGuard: async (input: unknown, run: () => Promise<unknown>) => {
    state.guardCalls.push(input);
    if (state.guardBusy) return { busy: true };
    return { busy: false, value: await run() };
  },
}));
vi.mock("@/lib/ai/run-metered", () => ({
  runMetered: async (input: { cost: number }) => {
    state.meteredCalls += 1;
    state.meteredCosts.push(input.cost);
    return state.meteredOutcome;
  },
}));

const { generateQuizAction } = await import("./actions");

const input = { domainIds: "all" as const, questionCount: 5, questionStyle: "ai" as never };

beforeEach(() => {
  state.access = { kind: "own", provider: "google", apiKey: "k" };
  state.guardBusy = false;
  state.guardCalls = [];
  state.meteredOutcome = { charged: true, value: ["q"], remaining: 5 };
  state.meteredCalls = 0;
  state.meteredCosts = [];
  state.slotCount = 1;
  state.generate.mockReset().mockResolvedValue(["q"]);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("generateQuizAction on the user's own key", () => {
  it("runs inside the run guard for the quiz feature", async () => {
    const result = await generateQuizAction(input);
    expect(result).toMatchObject({ questions: ["q"] });
    expect(state.guardCalls).toEqual([expect.objectContaining({ userId: "u1", feature: "quiz" })]);
    expect(state.meteredCalls).toBe(0);
  });

  it("refuses a duplicate request without generating or charging", async () => {
    state.guardBusy = true;
    const result = await generateQuizAction(input);
    expect(result).toMatchObject({ reason: "busy" });
    expect(state.generate).not.toHaveBeenCalled();
    expect(state.meteredCalls).toBe(0);
  });
});

describe("generateQuizAction on AI credits", () => {
  beforeEach(() => {
    state.access = {
      kind: "credits",
      provider: "google",
      apiKey: "central",
      remaining: 50,
      costs: { quizPerQuestion: 1, storyPerTerm: 1 },
    };
  });

  it("charges through runMetered", async () => {
    expect(await generateQuizAction(input)).toMatchObject({ questions: ["q"] });
    expect(state.meteredCalls).toBe(1);
  });

  it("charges only for the questions the model writes", async () => {
    state.slotCount = 3;
    await generateQuizAction(input);
    expect(state.meteredCosts).toEqual([3]);
  });

  it("neither charges nor runs the guard when the model has nothing to write", async () => {
    state.slotCount = 0;
    expect(await generateQuizAction(input)).toMatchObject({ questions: ["q"] });
    expect(state.meteredCalls).toBe(0);
    expect(state.guardCalls).toEqual([]);
    expect(state.generate).toHaveBeenCalledTimes(1);
  });

  it("reports a busy request as busy, not as a credits problem", async () => {
    state.meteredOutcome = { charged: false, reason: "busy" };
    expect(await generateQuizAction(input)).toMatchObject({ reason: "busy" });
  });
});

describe("generateQuizAction question limits", () => {
  it("refuses an AI quiz of more than 10 questions before doing anything", async () => {
    const result = await generateQuizAction({ ...input, questionCount: 11 });
    expect(result).toMatchObject({ error: "AI quizzes are limited to 10 questions." });
    expect(state.generate).not.toHaveBeenCalled();
    expect(state.guardCalls).toEqual([]);
  });

  it("accepts exactly 10 for AI", async () => {
    expect(await generateQuizAction({ ...input, questionCount: 10 })).toMatchObject({
      questions: ["q"],
    });
  });

  it("still allows a simple quiz past 10", async () => {
    const result = await generateQuizAction({
      ...input,
      questionCount: 20,
      questionStyle: "simple" as never,
    });
    expect(result).not.toHaveProperty("error", expect.stringContaining("limited"));
  });
});

describe("generateQuizAction when the feature is unavailable", () => {
  it("says so without pointing own-key users at a key", async () => {
    state.access = { kind: "unavailable", reason: "feature-off" };
    const result = await generateQuizAction(input);
    expect(result).toMatchObject({ reason: "feature-off" });
    expect(state.generate).not.toHaveBeenCalled();
  });
});
