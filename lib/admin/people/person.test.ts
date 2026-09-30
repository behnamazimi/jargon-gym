import { describe, expect, it, vi } from "vitest";
import { canModifyPerson, getPerson, narrationAccess } from "./person";

describe("narrationAccess", () => {
  it("is on only when both features allow the person", () => {
    expect(narrationAccess(2)).toBe("on");
    expect(narrationAccess(1)).toBe("partly");
    expect(narrationAccess(0)).toBe("off");
  });
});

describe("canModifyPerson", () => {
  it("allows members other than the admin themselves", () => {
    expect(canModifyPerson({ id: "m", role: "member" }, "a")).toBe(true);
    expect(canModifyPerson({ id: "a", role: "member" }, "a")).toBe(false);
    expect(canModifyPerson({ id: "b", role: "admin" }, "a")).toBe(false);
  });
});

type Options = {
  user?: unknown;
  allowed?: number;
  detail?: unknown[];
  waitlist?: unknown;
  ledger?: unknown[];
  audit?: unknown[];
  balance?: unknown;
  balanceError?: boolean;
};

function clients(options: Options) {
  const auditFilters: unknown[][] = [];
  const chain = (result: () => unknown, onFilter?: (args: unknown[]) => void) => {
    const node: Record<string, unknown> = {};
    const settle = () => Object.assign(Promise.resolve({ data: result(), error: null }), node);
    for (const method of ["select", "eq", "in", "ilike", "order", "limit"]) {
      node[method] = (...args: unknown[]) => {
        if (method === "in") onFilter?.(args);
        return settle();
      };
    }
    node.maybeSingle = () => Promise.resolve({ data: result(), error: null });
    return node;
  };
  const client = {
    from: (table: string) => {
      if (table === "users") return chain(() => options.user);
      if (table === "waitlist_requests") return chain(() => options.waitlist ?? null);
      if (table === "ai_credit_ledger") return chain(() => options.ledger ?? []);
      if (table === "admin_audit_log")
        return chain(
          () => options.audit ?? [],
          (args) => auditFilters.push(args),
        );
      return chain(() => Array.from({ length: options.allowed ?? 0 }, () => ({ feature: "x" })));
    },
    rpc: async () => ({ data: options.detail ?? [], error: null }),
  };
  const service = {
    rpc: async () =>
      options.balanceError
        ? { data: null, error: new Error("x") }
        : { data: options.balance ?? [], error: null },
  };
  return { client: client as never, service: service as never, auditFilters };
}

const user = {
  id: "u1",
  email: "a@example.test",
  role: "member",
  created_at: "2026-01-01T00:00:00Z",
};

const detail = {
  suspended_at: null,
  referral_verified: true,
  ban_mismatch: false,
  current_streak: 3,
  longest_streak: 9,
  last_active_date: "2026-09-29",
  key_provider: "google",
  key_last4: "1234",
  owned_collections: 2,
  people_using_collections: 1,
};

describe("getPerson", () => {
  it("returns null for an unknown person", async () => {
    const { client, service } = clients({ user: null });
    expect(await getPerson(client, service, "u1")).toBeNull();
  });

  it("returns null when the database has no detail for them", async () => {
    const { client, service } = clients({ user, detail: [] });
    expect(await getPerson(client, service, "u1")).toBeNull();
  });

  it("combines the account, detail, balance, narration access, ledger and history", async () => {
    const { client, service } = clients({
      user,
      allowed: 2,
      detail: [detail],
      balance: [{ enabled: true, total: 130, remaining: 100 }],
      ledger: [
        { id: 7, kind: "grant", feature: null, amount: 25, note: "beta", created_at: "2026-09-01" },
      ],
      audit: [
        {
          id: 1,
          created_at: "2026-09-02",
          actor_email: "admin@example.test",
          action: "suspend_user",
          target_type: "user",
          target_id: "u1",
          details: { reason: "spam" },
        },
      ],
    });
    expect(await getPerson(client, service, "u1")).toEqual({
      id: "u1",
      email: "a@example.test",
      role: "member",
      createdAt: "2026-01-01T00:00:00Z",
      suspendedAt: null,
      referralVerified: true,
      banMismatch: false,
      currentStreak: 3,
      longestStreak: 9,
      lastActiveDate: "2026-09-29",
      key: { provider: "google", last4: "1234" },
      ownedCollections: 2,
      peopleUsingCollections: 1,
      credits: { remaining: 100, total: 130 },
      narration: "on",
      waitlist: null,
      ledger: [
        { id: 7, kind: "grant", feature: null, amount: 25, note: "beta", createdAt: "2026-09-01" },
      ],
      history: [
        {
          id: 1,
          createdAt: "2026-09-02",
          actorEmail: "admin@example.test",
          action: "suspend_user",
          targetType: "user",
          targetId: "u1",
          details: { reason: "spam" },
        },
      ],
    });
  });

  it("has no key when none is saved", async () => {
    const { client, service } = clients({
      user,
      detail: [{ ...detail, key_provider: null, key_last4: null }],
    });
    expect((await getPerson(client, service, "u1"))?.key).toBeNull();
  });

  it("derives the waitlist state, and includes the request in the history", async () => {
    const invited = { id: "w1", status: "invited", referral_codes: { used_at: null } };
    const signedUp = { id: "w1", status: "invited", referral_codes: { used_at: "2026-09-01" } };
    for (const [waitlist, expected] of [
      [invited, "invited"],
      [signedUp, "signed_up"],
      [{ id: "w1", status: "pending", referral_codes: null }, "pending"],
    ] as const) {
      const { client, service, auditFilters } = clients({ user, detail: [detail], waitlist });
      const person = await getPerson(client, service, "u1");
      expect(person?.waitlist).toEqual({ id: "w1", status: expected });
      expect(auditFilters).toContainEqual(["target_id", ["u1", "w1"]]);
    }
  });

  it("shows the balance as unknown, not zero, when it can't be read", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const { client, service } = clients({ user, detail: [detail], balanceError: true });
      expect((await getPerson(client, service, "u1"))?.credits).toBeNull();
    } finally {
      spy.mockRestore();
    }
  });
});
