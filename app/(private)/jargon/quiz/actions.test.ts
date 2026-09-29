import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  access: { kind: "own", provider: "google", apiKey: "k" } as Record<string, unknown>,
  guardBusy: false,
  guardCalls: [] as unknown[],
  meteredOutcome: { charged: true, value: ["q"], remaining: 5 } as Record<string, unknown>,
  meteredCalls: 0,
  generate: vi.fn(),
}));

vi.mock("@/lib/auth/require-session", () => ({
  requireAuthenticatedClient: async () => ({ supabase: {}, user: { id: "u1" } }),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/quiz/terms", () => ({ fetchQuizTermPool: async () => [{ id: "t1" }] }));
vi.mock("@/lib/quiz/generate", () => ({ generateQuizQuestions: state.generate }));
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
  runMetered: async () => {
    state.meteredCalls += 1;
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

  it("reports a busy request as busy, not as a credits problem", async () => {
    state.meteredOutcome = { charged: false, reason: "busy" };
    expect(await generateQuizAction(input)).toMatchObject({ reason: "busy" });
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
