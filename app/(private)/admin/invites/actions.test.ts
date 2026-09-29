import { beforeEach, describe, expect, it, vi } from "vitest";

type Result = { data?: unknown; error?: unknown };

const state = vi.hoisted(() => ({
  request: { id: "r1", email: "a@example.test", status: "pending" } as Record<string, unknown>,
  resendRequest: null as Record<string, unknown> | null,
  claimed: [{ id: "r1" }] as unknown[],
  account: null as { id: string } | null,
  emailError: null as Error | null,
  calls: [] as string[],
  updates: [] as { table: string; values: unknown }[],
  ilikeArgs: [] as string[],
  sent: [] as { to: string; signupUrl: string }[],
}));

vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => state.calls.push(`reval:${path}`),
}));
vi.mock("@/lib/auth/app-origin", () => ({ getAppOrigin: async () => "https://app.test" }));
vi.mock("@/lib/email/resend", () => ({
  sendInviteEmail: async (input: { to: string; signupUrl: string }) => {
    state.calls.push("email");
    if (state.emailError) throw state.emailError;
    state.sent.push(input);
  },
}));

/** A query builder whose every step can also be awaited, like Supabase's. */
function chain(table: string, list: () => Result, single: () => Result) {
  const node: Record<string, unknown> = {};
  const settle = () => Object.assign(Promise.resolve(list()), node);
  for (const method of ["select", "eq", "neq", "limit"]) node[method] = settle;
  node.ilike = (_column: string, pattern: string) => {
    state.ilikeArgs.push(pattern);
    return settle();
  };
  node.update = (values: unknown) => {
    state.updates.push({ table, values });
    if (table === "waitlist_requests" && (values as { status?: string }).status === "invited") {
      state.calls.push("claim");
    }
    return node;
  };
  node.single = () => Promise.resolve(single());
  node.maybeSingle = () => Promise.resolve(single());
  return node;
}

vi.mock("@/lib/auth/require-session", async () => {
  const { AdminError } = await import("@/lib/admin/admin-error");
  return {
    requireAdminClient: async () => ({
      user: { id: "admin-1" },
      supabase: {
        rpc: async () => {
          state.calls.push("code");
          return { data: { id: "c1", code: "ABC123" }, error: null };
        },
        from: (table: string) => {
          const account = { data: state.account, error: null };
          if (table === "users")
            return chain(
              table,
              () => account,
              () => account,
            );
          if (table === "referral_codes")
            return chain(
              table,
              () => ({ error: null }),
              () => ({}),
            );
          return chain(
            table,
            () => ({ data: state.claimed, error: null }),
            () => ({ data: state.resendRequest ?? state.request, error: null }),
          );
        },
      },
    }),
    AdminError,
  };
});

const { approveWaitlistRequest, resendInvite } = await import("./actions");

beforeEach(() => {
  state.request = { id: "r1", email: "a@example.test", status: "pending" };
  state.resendRequest = null;
  state.claimed = [{ id: "r1" }];
  state.account = null;
  state.emailError = null;
  state.calls = [];
  state.updates = [];
  state.ilikeArgs = [];
  state.sent = [];
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("approveWaitlistRequest", () => {
  it("creates a code, claims the request, then sends the email", async () => {
    expect(await approveWaitlistRequest("r1")).toEqual({ ok: true, data: { emailSent: true } });
    expect(state.calls).toEqual(["code", "claim", "reval:/admin/invites", "email"]);
    expect(state.sent).toEqual([
      {
        to: "a@example.test",
        signupUrl: "https://app.test/signup?ref=ABC123&email=a%40example.test",
      },
    ]);
  });

  it("sends existing accounts to finish signup, matching the email exactly", async () => {
    state.request = { id: "r1", email: "a_b@example.test", status: "pending" };
    state.account = { id: "u1" };
    await approveWaitlistRequest("r1");
    expect(state.ilikeArgs).toEqual(["a\\_b@example.test"]);
    expect(state.sent[0]?.signupUrl).toBe("https://app.test/complete-signup?ref=ABC123");
  });

  it("refuses a request that was already handled, before any code exists", async () => {
    state.request = { id: "r1", email: "a@example.test", status: "invited" };
    expect(await approveWaitlistRequest("r1")).toEqual({
      ok: false,
      error: "Request already handled.",
    });
    expect(state.calls).toEqual([]);
  });

  it("sends nothing and retires the code when another click won the race", async () => {
    state.claimed = [];
    expect(await approveWaitlistRequest("r1")).toEqual({
      ok: false,
      error: "Request already handled.",
    });
    expect(state.calls).not.toContain("email");
    expect(state.updates.at(-1)).toEqual({ table: "referral_codes", values: { is_active: false } });
  });

  it("keeps the request invited and says so when the email fails", async () => {
    state.emailError = new Error("Resend is down");
    expect(await approveWaitlistRequest("r1")).toEqual({ ok: true, data: { emailSent: false } });
    expect(state.updates.filter((u) => u.table === "waitlist_requests")).toHaveLength(1);
  });
});

describe("resendInvite", () => {
  const invited = (code: Record<string, unknown> | null) => ({
    email: "a@example.test",
    status: "invited",
    referral_codes: code,
  });

  it("sends the same code again", async () => {
    state.resendRequest = invited({ code: "ABC123", used_by: null, is_active: true });
    expect(await resendInvite("r1")).toEqual({ ok: true, data: undefined });
    expect(state.sent[0]?.signupUrl).toContain("ref=ABC123");
    expect(state.calls).not.toContain("code");
  });

  it("refuses pending requests, used codes and inactive codes", async () => {
    state.resendRequest = { email: "a@example.test", status: "pending", referral_codes: null };
    expect(await resendInvite("r1")).toMatchObject({ ok: false });

    state.resendRequest = invited({ code: "X", used_by: "u9", is_active: true });
    expect(await resendInvite("r1")).toEqual({ ok: false, error: "They already signed up." });

    state.resendRequest = invited({ code: "X", used_by: null, is_active: false });
    expect(await resendInvite("r1")).toEqual({
      ok: false,
      error: "That invite code is no longer active.",
    });
    expect(state.sent).toEqual([]);
  });

  it("reports an email failure", async () => {
    state.resendRequest = invited({ code: "ABC123", used_by: null, is_active: true });
    state.emailError = new Error("Resend is down");
    expect(await resendInvite("r1")).toEqual({
      ok: false,
      error: "Couldn't send the email. Try again.",
    });
  });
});
