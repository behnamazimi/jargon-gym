import { beforeEach, describe, expect, it, vi } from "vitest";

type Result = { data?: unknown; error?: unknown };

const state = vi.hoisted(() => ({
  lastId: "" as string,
  auditError: null as Error | null,
  byId: {} as Record<string, Record<string, unknown>>,
  request: { id: "r1", email: "a@example.test", status: "pending" } as Record<string, unknown>,
  resendRequest: null as Record<string, unknown> | null,
  claimed: [{ id: "r1" }] as unknown[],
  account: null as { id: string } | null,
  emailError: null as Error | null,
  calls: [] as string[],
  updates: [] as { table: string; values: unknown }[],
  ilikeArgs: [] as string[],
  sent: [] as { to: string; signupUrl: string }[],
  audits: [] as { action: string; targetId?: string; details?: unknown }[],
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
  for (const method of ["select", "neq", "limit", "in"]) node[method] = settle;
  node.eq = (column: string, value: string) => {
    if (column === "id") state.lastId = value;
    return settle();
  };
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
        rpc: async (
          name: string,
          args: { p_action?: string; p_target_id?: string; p_details?: unknown },
        ) => {
          if (name === "admin_write_audit") {
            state.audits.push({
              action: args.p_action ?? "",
              targetId: args.p_target_id,
              details: args.p_details,
            });
            return { error: state.auditError };
          }
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
            () => ({
              data: state.byId[state.lastId] ?? state.resendRequest ?? state.request,
              error: null,
            }),
          );
        },
      },
    }),
    AdminError,
  };
});

const { approveWaitlistRequest, approveWaitlistRequests, resendInvite } = await import("./actions");

beforeEach(() => {
  state.request = { id: "r1", email: "a@example.test", status: "pending" };
  state.resendRequest = null;
  state.byId = {};
  state.claimed = [{ id: "r1" }];
  state.account = null;
  state.emailError = null;
  state.calls = [];
  state.updates = [];
  state.ilikeArgs = [];
  state.sent = [];
  state.audits = [];
  state.auditError = null;
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("approveWaitlistRequest", () => {
  it("creates a code, claims the request, then sends the email", async () => {
    expect(await approveWaitlistRequest("r1")).toEqual({ ok: true, data: { emailSent: true } });
    expect(state.calls).toEqual([
      "code",
      "claim",
      "email",
      "reval:/admin/people",
      "reval:/admin/people/[id]",
      "reval:/admin",
    ]);
    expect(state.sent).toEqual([
      {
        to: "a@example.test",
        signupUrl: "https://app.test/signup?ref=ABC123&email=a%40example.test",
      },
    ]);
  });

  it("records the approval, including a failed email, and not a lost race", async () => {
    await approveWaitlistRequest("r1");
    expect(state.audits).toEqual([
      { action: "app.waitlist_approve", targetId: "r1", details: { emailSent: true } },
    ]);

    state.audits = [];
    state.emailError = new Error("down");
    await approveWaitlistRequest("r1");
    expect(state.audits[0]?.details).toEqual({ emailSent: false });

    state.audits = [];
    state.emailError = null;
    state.claimed = [];
    await approveWaitlistRequest("r1");
    expect(state.audits).toEqual([]);
  });

  it("still approves when the audit row can't be written", async () => {
    state.auditError = new Error("audit down");
    expect(await approveWaitlistRequest("r1")).toEqual({ ok: true, data: { emailSent: true } });
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

const ID1 = "3f2b8c1e-0a4d-4c55-9d1e-7a6b5c4d3e2f";
const ID2 = "4a3c9d2f-1b5e-4d66-8e2f-8b7c6d5e4f30";
const ID3 = "5b4dae30-2c6f-4e77-9f30-9c8d7e6f5041";

describe("approveWaitlistRequests", () => {
  it("approves each request, reporting who was already handled and whose email failed", async () => {
    state.byId = {
      [ID1]: { id: ID1, email: "one@example.test", status: "pending" },
      [ID2]: { id: ID2, email: "two@example.test", status: "invited" },
      [ID3]: { id: ID3, email: "three@example.test", status: "pending" },
    };
    const result = await approveWaitlistRequests([ID1, ID2, ID3, ID1]);
    expect(result).toEqual({
      ok: true,
      data: {
        approved: 2,
        emailFailed: [],
        failed: [{ id: ID2, email: null, error: "Request already handled." }],
      },
    });
    expect(state.sent.map((mail) => mail.to)).toEqual(["one@example.test", "three@example.test"]);
    expect(state.calls.filter((call) => call.startsWith("reval"))).toEqual([
      "reval:/admin/people",
      "reval:/admin/people/[id]",
      "reval:/admin",
    ]);
  });

  it("names whose email failed", async () => {
    state.byId = { [ID1]: { id: ID1, email: "one@example.test", status: "pending" } };
    state.emailError = new Error("Resend is down");
    const result = await approveWaitlistRequests([ID1]);
    expect(result).toMatchObject({
      ok: true,
      data: { approved: 1, emailFailed: ["one@example.test"] },
    });
  });

  it("refuses an empty list, too many, and things that aren't ids", async () => {
    expect((await approveWaitlistRequests([])).ok).toBe(false);
    expect((await approveWaitlistRequests(["nope"])).ok).toBe(false);
    const many = Array.from(
      { length: 11 },
      (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    );
    expect(await approveWaitlistRequests(many)).toEqual({
      ok: false,
      error: "Choose between 1 and 10 requests.",
    });
    expect(state.calls).toEqual([]);
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

  it("records a resend only after it was sent", async () => {
    state.resendRequest = invited({ code: "ABC123", used_by: null, is_active: true });
    await resendInvite("r1");
    expect(state.audits).toEqual([{ action: "app.invite_resend", targetId: "r1", details: {} }]);
    state.audits = [];
    state.emailError = new Error("down");
    await resendInvite("r1");
    expect(state.audits).toEqual([]);
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
