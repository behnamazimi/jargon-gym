import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  admin: true,
  account: { id: "u1" } as { id: string } | null,
  rpcError: null as Error | null,
  rpcCalls: [] as { name: string; args: unknown }[],
  audits: [] as unknown[],
  ilikeArgs: [] as unknown[],
  revalidated: [] as string[],
  featureRows: [{ feature: "quiz" }] as { feature: string }[],
  featureUpdates: [] as unknown[],
}));

vi.mock("next/cache", () => ({ revalidatePath: (path: string) => state.revalidated.push(path) }));
vi.mock("@/lib/auth/require-session", async () => {
  const { AdminError } = await import("@/lib/admin/admin-error");
  return {
    requireAdminClient: async () => {
      if (!state.admin) throw new AdminError("Admins only.");
      return {
        supabase: {
          from: () => ({
            update: (values: unknown) => ({
              eq: () => {
                state.featureUpdates.push(values);
                return Object.assign(Promise.resolve({ error: null }), {
                  select: () => Promise.resolve({ data: state.featureRows, error: null }),
                });
              },
            }),
            select: () => ({
              ilike: (_column: string, pattern: string) => {
                state.ilikeArgs.push(pattern);
                return { maybeSingle: () => Promise.resolve({ data: state.account, error: null }) };
              },
            }),
          }),
          rpc: (name: string, args: unknown) => {
            if (name === "admin_write_audit") {
              state.audits.push(args);
              return Promise.resolve({ error: null });
            }
            state.rpcCalls.push({ name, args });
            return Promise.resolve({ error: state.rpcError });
          },
        },
      };
    },
  };
});

const { grantAiCredits, resetAiCredits, saveAiCreditSettings, setAiCreditsEnabled } =
  await import("./actions");

beforeEach(() => {
  state.admin = true;
  state.account = { id: "u1" };
  state.rpcError = null;
  state.rpcCalls = [];
  state.audits = [];
  state.ilikeArgs = [];
  state.revalidated = [];
  state.featureRows = [{ feature: "quiz" }];
  state.featureUpdates = [];
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("grantAiCredits", () => {
  it("grants to the account matched by an exact, escaped email", async () => {
    const result = await grantAiCredits({
      email: "first_last@example.com",
      amount: 25,
      note: "beta",
    });

    expect(result).toEqual({ ok: true, data: undefined });
    expect(state.ilikeArgs).toEqual(["first\\_last@example.com"]);
    expect(state.rpcCalls).toEqual([
      {
        name: "admin_grant_ai_credits",
        args: { p_user_id: "u1", p_amount: 25, p_note: "beta" },
      },
    ]);
    expect(state.revalidated).toEqual([
      "/admin",
      "/admin/ai",
      "/admin/ai/credits",
      "/admin/people",
      "/admin/people/[id]",
    ]);
  });

  it("returns readable messages for expected mistakes, without granting", async () => {
    expect(await grantAiCredits({ email: "a@example.com", amount: 0 })).toEqual({
      ok: false,
      error: "Enter at least 1 credit.",
    });

    state.account = null;
    expect(await grantAiCredits({ email: "nobody@example.com", amount: 5 })).toEqual({
      ok: false,
      error: "No account found for that email.",
    });
    expect(state.rpcCalls).toEqual([]);
    expect(state.revalidated).toEqual([]);
  });

  it("hides database errors behind a generic message", async () => {
    state.rpcError = new Error("permission denied for table x");
    expect(await grantAiCredits({ email: "a@example.com", amount: 5 })).toEqual({
      ok: false,
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
    expect(await saveAiCreditSettings(valid)).toMatchObject({ ok: true });
    expect(state.rpcCalls).toEqual([
      {
        name: "admin_set_ai_credit_settings",
        args: { p_default_allowance: 100, p_monthly_refill: 30, p_quiz_cost: 1, p_story_cost: 1 },
      },
    ]);
    state.rpcCalls = [];
    expect(await saveAiCreditSettings({ ...valid, quizCreditsPerQuestion: 0 })).toEqual({
      ok: false,
      error: "Check the numbers and try again.",
    });
  });

  it("switch credits on or off and reset usage", async () => {
    expect(await setAiCreditsEnabled(false)).toMatchObject({ ok: true });
    expect(state.audits).toEqual([
      {
        p_action: "app.ai_credits_enabled",
        p_target_type: "settings",
        p_target_id: "ai_credits",
        p_details: { enabled: false },
      },
    ]);
    expect(await resetAiCredits("u1")).toMatchObject({ ok: true });
    expect(state.rpcCalls).toEqual([
      { name: "admin_reset_ai_credits", args: { p_user_id: "u1", p_note: "" } },
    ]);
  });

  it("refuse anyone who isn't an admin", async () => {
    state.admin = false;
    expect(await setAiCreditsEnabled(true)).toEqual({ ok: false, error: "Admins only." });
    expect(await resetAiCredits("u1")).toEqual({ ok: false, error: "Admins only." });
    expect(state.rpcCalls).toEqual([]);
  });
});
