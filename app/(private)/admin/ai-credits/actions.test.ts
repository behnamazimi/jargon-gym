import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  admin: true,
  account: { id: "u1" } as { id: string } | null,
  rpcError: null as Error | null,
  rpcCalls: [] as { name: string; args: unknown }[],
  ilikeArgs: [] as unknown[],
  revalidated: [] as string[],
}));

vi.mock("next/cache", () => ({ revalidatePath: (path: string) => state.revalidated.push(path) }));
vi.mock("@/lib/auth/require-session", () => ({
  requireAdminClient: async () => {
    if (!state.admin) throw new Error("Admins only.");
    return {
      supabase: {
        from: () => ({
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
          select: () => ({
            ilike: (_column: string, pattern: string) => {
              state.ilikeArgs.push(pattern);
              return { maybeSingle: () => Promise.resolve({ data: state.account, error: null }) };
            },
          }),
        }),
        rpc: (name: string, args: unknown) => {
          state.rpcCalls.push({ name, args });
          return Promise.resolve({ error: state.rpcError });
        },
      },
    };
  },
}));

const { grantAiCredits, resetAiCredits, saveAiCreditSettings, setAiCreditsEnabled } =
  await import("./actions");

beforeEach(() => {
  state.admin = true;
  state.account = { id: "u1" };
  state.rpcError = null;
  state.rpcCalls = [];
  state.ilikeArgs = [];
  state.revalidated = [];
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("grantAiCredits", () => {
  it("grants to the account matched by an exact, escaped email", async () => {
    const result = await grantAiCredits({
      email: "first_last@example.com",
      amount: 25,
      note: "beta",
    });

    expect(result).toEqual({});
    expect(state.ilikeArgs).toEqual(["first\\_last@example.com"]);
    expect(state.rpcCalls).toEqual([
      {
        name: "admin_grant_ai_credits",
        args: { p_user_id: "u1", p_amount: 25, p_note: "beta" },
      },
    ]);
    expect(state.revalidated).toEqual(["/admin/ai-credits"]);
  });

  it("returns readable messages for expected mistakes, without granting", async () => {
    expect(await grantAiCredits({ email: "a@example.com", amount: 0 })).toEqual({
      error: "Enter at least 1 credit.",
    });

    state.account = null;
    expect(await grantAiCredits({ email: "nobody@example.com", amount: 5 })).toEqual({
      error: "No account found for that email.",
    });
    expect(state.rpcCalls).toEqual([]);
    expect(state.revalidated).toEqual([]);
  });

  it("hides database errors behind a generic message", async () => {
    state.rpcError = new Error("permission denied for table x");
    expect(await grantAiCredits({ email: "a@example.com", amount: 5 })).toEqual({
      error: "Something went wrong. Try again.",
    });
  });
});

describe("the other admin actions", () => {
  it("save valid settings and refuse invalid ones", async () => {
    const valid = {
      defaultAllowance: 100,
      monthlyRefill: 30,
      quizCreditsPerQuestion: 1,
      storyCreditsPerTerm: 1,
    };
    expect(await saveAiCreditSettings(valid)).toEqual({});
    expect(await saveAiCreditSettings({ ...valid, quizCreditsPerQuestion: 0 })).toEqual({
      error: "Check the numbers and try again.",
    });
  });

  it("switch credits on or off and reset usage", async () => {
    expect(await setAiCreditsEnabled(false)).toEqual({});
    expect(await resetAiCredits("u1")).toEqual({});
    expect(state.rpcCalls).toEqual([
      { name: "admin_reset_ai_credits", args: { p_user_id: "u1", p_note: "" } },
    ]);
  });

  it("refuse anyone who isn't an admin", async () => {
    state.admin = false;
    expect(await setAiCreditsEnabled(true)).toEqual({ error: "Something went wrong. Try again." });
    expect(await resetAiCredits("u1")).toEqual({ error: "Something went wrong. Try again." });
    expect(state.rpcCalls).toEqual([]);
  });
});
