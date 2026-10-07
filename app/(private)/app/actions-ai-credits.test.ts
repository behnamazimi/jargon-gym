import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  signedIn: true,
  rpcData: [{ added: 30, remaining: 42 }] as { added: number; remaining: number }[] | null,
  rpcError: null as { message: string } | null,
  emails: [] as { to: unknown; subject: string }[],
  admins: [{ email: "admin@x.test" }] as { email: string }[],
  sendFails: false,
  revalidated: [] as string[],
}));

vi.mock("next/server", () => ({
  after: (run: () => Promise<void>) => void run(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => void state.revalidated.push(path),
}));
vi.mock("@/lib/auth/app-origin", () => ({ getAppOrigin: async () => "https://x.test" }));
vi.mock("@/lib/auth/require-session", () => ({
  requireAuthenticatedClient: async () =>
    state.signedIn
      ? {
          user: { id: "u1", email: "me@x.test" },
          supabase: {
            rpc: async () => ({ data: state.rpcData, error: state.rpcError }),
          },
        }
      : { error: "Log in to continue." },
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({ select: () => ({ eq: async () => ({ data: state.admins, error: null }) }) }),
  }),
}));
vi.mock("@/lib/email/resend", () => ({
  sendRequestEmail: async (input: { to: unknown; email: { subject: string } }) => {
    if (state.sendFails) throw new Error("resend down");
    state.emails.push({ to: input.to, subject: input.email.subject });
  },
}));
vi.mock("@/lib/ai-credits/repository", () => ({ getMyCreditState: async () => null }));

const { topUpAiCreditsAction } = await import("./actions-ai-credits");

beforeEach(() => {
  state.signedIn = true;
  state.rpcData = [{ added: 30, remaining: 42 }];
  state.rpcError = null;
  state.emails = [];
  state.admins = [{ email: "admin@x.test" }];
  state.sendFails = false;
  state.revalidated = [];
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("topUpAiCreditsAction", () => {
  it("adds the credits and emails the user and the admins", async () => {
    expect(await topUpAiCreditsAction()).toEqual({ ok: true, added: 30, remaining: 42 });
    await vi.waitFor(() => expect(state.emails).toHaveLength(2));
    expect(state.emails.map((email) => email.to)).toEqual(["me@x.test", ["admin@x.test"]]);
    expect(state.revalidated).toContain("/app/settings");
  });

  it("still succeeds when the emails can't be sent", async () => {
    state.sendFails = true;
    expect(await topUpAiCreditsAction()).toMatchObject({ ok: true });
  });

  it("says so when credits are switched off", async () => {
    state.rpcData = null;
    state.rpcError = { message: "topup_unavailable" };
    expect(await topUpAiCreditsAction()).toEqual({ ok: false, reason: "unavailable" });
    expect(state.emails).toEqual([]);
  });

  it("refuses when the person still has plenty of credits", async () => {
    state.rpcData = null;
    state.rpcError = { message: "topup_not_needed" };
    expect(await topUpAiCreditsAction()).toEqual({ ok: false, reason: "not-needed" });
    expect(state.emails).toEqual([]);
  });

  it("reports other failures without leaking them", async () => {
    state.rpcData = null;
    state.rpcError = { message: "relation missing" };
    expect(await topUpAiCreditsAction()).toEqual({ ok: false, reason: "failed" });
  });

  it("refuses when signed out", async () => {
    state.signedIn = false;
    expect(await topUpAiCreditsAction()).toEqual({ ok: false, reason: "failed" });
  });
});
