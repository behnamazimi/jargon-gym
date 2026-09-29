import { describe, expect, it, vi } from "vitest";
import { getPerson, narrationAccess } from "./person";

describe("narrationAccess", () => {
  it("is on only when both features allow the person", () => {
    expect(narrationAccess(2)).toBe("on");
    expect(narrationAccess(1)).toBe("partly");
    expect(narrationAccess(0)).toBe("off");
  });
});

function clients(options: {
  user?: unknown;
  allowed?: number;
  balance?: unknown;
  balanceError?: boolean;
}) {
  const chain = (data: unknown) => {
    const node: Record<string, unknown> = {};
    const settle = () => Object.assign(Promise.resolve({ data, error: null }), node);
    for (const m of ["select", "eq", "in"]) node[m] = settle;
    node.maybeSingle = () => Promise.resolve({ data, error: null });
    return node;
  };
  const client = {
    from: (table: string) =>
      table === "users"
        ? chain(options.user)
        : chain(Array.from({ length: options.allowed ?? 0 }, () => ({ feature: "x" }))),
  };
  const service = {
    rpc: async () =>
      options.balanceError
        ? { data: null, error: new Error("x") }
        : { data: options.balance ?? [], error: null },
  };
  return { client: client as never, service: service as never };
}

const user = {
  id: "u1",
  email: "a@example.test",
  role: "member",
  created_at: "2026-01-01T00:00:00Z",
};

describe("getPerson", () => {
  it("returns null for an unknown person", async () => {
    const { client, service } = clients({ user: null });
    expect(await getPerson(client, service, "u1")).toBeNull();
  });

  it("combines the account, balance and narration access", async () => {
    const { client, service } = clients({
      user,
      allowed: 2,
      balance: [{ enabled: true, total: 130, remaining: 100 }],
    });
    expect(await getPerson(client, service, "u1")).toEqual({
      id: "u1",
      email: "a@example.test",
      role: "member",
      createdAt: "2026-01-01T00:00:00Z",
      credits: { remaining: 100, total: 130 },
      narration: "on",
    });
  });

  it("shows the balance as unknown, not zero, when it can't be read", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const { client, service } = clients({ user, balanceError: true });
      expect((await getPerson(client, service, "u1"))?.credits).toBeNull();
    } finally {
      spy.mockRestore();
    }
  });
});
